import CustomError from "../lib/Error";
import userRepository from "../repositories/user.repository";
import walletRepository from "../repositories/wallet.repository";
import zynkWalletRepository from "../repositories/zynk-wallet.repository";
import {
  generateKeypair,
  decryptCredentialBundle,
  signPayload,
} from "../lib/wallet-crypto";
import type { VerifySessionInput, CreateWalletInput } from "../schemas/wallet.schema";

// Session expiry in minutes (from env or default 15)
const SESSION_EXPIRY_MINUTES = parseInt(
  process.env.WALLET_SESSION_EXPIRY_MINUTES || "15",
  10
);

class WalletService {
  // ============================================
  // Session Management
  // ============================================

  /**
   * Initiate wallet session - sends OTP to user's email
   * If auth is already registered, just send OTP
   */
  async initiateSession(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new CustomError(400, "User must complete KYC before creating a wallet");
    }

    let otpId: string;

    try {
      // Try to register auth first (this also sends OTP)
      const response = await zynkWalletRepository.registerAuth(
        user.zynkEntityId,
        user.email
      );
      otpId = response.data.otpId;
    } catch (error) {
      // If already registered, just initiate OTP
      const errorMessage =
        error instanceof CustomError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);

      if (
        errorMessage.includes("already has a registered") ||
        errorMessage.includes("already registered") ||
        errorMessage.includes("Turnkey organization")
      ) {
        const otpResponse = await zynkWalletRepository.initiateOtp(
          user.zynkEntityId
        );
        otpId = otpResponse.data.otpId;
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Create session record in database
    await walletRepository.createSession({
      userId: user.id,
      otpId,
    });

    return {
      otpId,
      message: "OTP sent to your registered email",
    };
  }

  /**
   * Verify OTP and establish session with HPKE handshake
   */
  async verifySession(userId: number, input: VerifySessionInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new CustomError(400, "User must complete KYC before creating a wallet");
    }

    // Find the pending session
    const session = await walletRepository.findSessionByOtpId(input.otpId);
    if (!session) {
      throw new CustomError(404, "Session not found");
    }

    if (session.userId !== userId) {
      throw new CustomError(403, "Session does not belong to this user");
    }

    if (session.status !== "PENDING") {
      throw new CustomError(400, "Session is not in pending state");
    }

    // Generate ephemeral keypair for HPKE
    const ephemeralKeys = generateKeypair(false); // Uncompressed public key

    // Start session with Zynk (HPKE handshake)
    const zynkResponse = await zynkWalletRepository.startSession(
      user.zynkEntityId,
      {
        otpId: input.otpId,
        otpCode: input.otpCode,
        publicKey: ephemeralKeys.publicKey,
      }
    );

    // Decrypt the credential bundle to get session keys
    const decryptedKeys = await decryptCredentialBundle(
      zynkResponse.data.credentialBundle,
      ephemeralKeys.privateKey
    );

    // Calculate session expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_EXPIRY_MINUTES);

    // Update session with session keys
    await walletRepository.updateSession(input.otpId, {
      sessionPublicKey: decryptedKeys.sessionPublicKey,
      sessionPrivateKey: decryptedKeys.sessionPrivateKey,
      status: "VERIFIED",
      expiresAt,
    });

    return {
      sessionId: session.id,
      expiresAt,
      message: "Session verified successfully",
    };
  }

  // ============================================
  // Wallet Operations
  // ============================================

  /**
   * Create wallet for user
   * Returns existing wallet if user already has one
   *
   * Flow:
   * 1. Prepare wallet creation → get payload to sign
   * 2. Sign payload → submit wallet → get walletId
   * 3. Prepare account creation → get payload to sign
   * 4. Sign payload → submit account → get account details
   */
  async createWallet(userId: number, input: CreateWalletInput) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new CustomError(400, "User must complete KYC before creating a wallet");
    }

    // Check if user already has a wallet
    const existingWallet = await walletRepository.findWalletByUserId(userId);
    if (existingWallet) {
      // Return existing wallet instead of error
      return {
        wallet: existingWallet,
        account: existingWallet.account,
        isExisting: true,
      };
    }

    // Get active session
    const session = await walletRepository.findActiveSessionByUserId(userId);
    if (!session) {
      throw new CustomError(401, "No active session. Please verify OTP first.");
    }

    if (!session.sessionPrivateKey || !session.sessionPublicKey) {
      throw new CustomError(400, "Session keys not found. Please verify OTP again.");
    }

    // Get chain from environment
    const chain = process.env.DEFAULT_WALLET_CHAIN || "SOLANA";
    const walletName = input.walletName || "Primary Wallet";

    // ============================================
    // Step 1: Create Wallet
    // ============================================

    // Prepare wallet creation with Zynk (entityId in URL path)
    const prepareWalletResponse = await zynkWalletRepository.prepareWallet(
      user.zynkEntityId,
      { walletName, chain }
    );

    // Sign the wallet creation payload
    const walletSignature = signPayload(
      prepareWalletResponse.data.payloadToSign,
      session.sessionPrivateKey,
      session.sessionPublicKey
    );

    // Submit wallet creation
    const submitWalletResponse = await zynkWalletRepository.submitWallet({
      payloadId: prepareWalletResponse.data.payloadId,
      signature: walletSignature,
    });

    const walletId = submitWalletResponse.data.walletId;
    if (!walletId) {
      throw new CustomError(500, "Wallet creation failed: no walletId returned");
    }

    // ============================================
    // Step 2: Create Account
    // ============================================

    // Prepare account creation with the new walletId
    const prepareAccountResponse = await zynkWalletRepository.prepareAccount(
      walletId,
      { chain }
    );

    // Sign the account creation payload
    const accountSignature = signPayload(
      prepareAccountResponse.data.payloadToSign,
      session.sessionPrivateKey,
      session.sessionPublicKey
    );

    // Submit account creation
    const submitAccountResponse = await zynkWalletRepository.submitAccount({
      payloadId: prepareAccountResponse.data.payloadId,
      signature: accountSignature,
    });

    // Get account data from response
    const accountData = submitAccountResponse.data.account;
    if (!accountData || !accountData.address) {
      throw new CustomError(500, "Account creation failed: no account data returned");
    }

    // ============================================
    // Step 3: Save to Database
    // ============================================

    // Create wallet and account in database
    const wallet = await walletRepository.createWalletWithAccount(
      {
        userId,
        zynkWalletId: walletId,
        walletName,
        chain,
      },
      {
        address: accountData.address,
        curve: accountData.curve,
        pathFormat: accountData.pathFormat,
        path: accountData.path,
        addressFormat: accountData.addressFormat,
      }
    );

    // Mark session as used
    await walletRepository.markSessionAsUsed(session.otpId);

    return {
      wallet,
      account: wallet.account,
      isExisting: false,
    };
  }

  /**
   * Get user's wallet with account details
   */
  async getWallet(userId: number) {
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    return wallet;
  }

  /**
   * Get wallet balances from Zynk
   */
  async getBalances(userId: number) {
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    const response = await zynkWalletRepository.getBalances(wallet.zynkWalletId);

    return {
      wallet: {
        id: wallet.id,
        walletName: wallet.walletName,
        address: wallet.account?.address,
      },
      balances: response.data.balances,
    };
  }

  /**
   * Get transaction history from Zynk
   */
  async getTransactions(
    userId: number,
    options?: { limit?: number; offset?: number }
  ) {
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    if (!wallet.account) {
      throw new CustomError(404, "Wallet account not found");
    }

    const response = await zynkWalletRepository.getTransactions(
      wallet.zynkWalletId,
      wallet.account.address,
      options
    );

    return {
      wallet: {
        id: wallet.id,
        walletName: wallet.walletName,
        address: wallet.account.address,
      },
      transactions: response.data.transactions,
      total: response.data.total,
    };
  }
}

export default new WalletService();
