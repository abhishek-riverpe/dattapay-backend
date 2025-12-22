import { AxiosError } from "axios";
import zynkClient from "../lib/zynk-client";
import Error from "../lib/Error";

// ============================================
// Request/Response Interfaces
// ============================================

interface ZynkErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: string;
  };
}

// Register Auth
interface RegisterAuthResponse {
  success: boolean;
  data: {
    otpId: string;
  };
}

// Initiate OTP
interface InitiateOtpResponse {
  success: boolean;
  data: {
    otpId: string;
  };
}

// Start Session
interface StartSessionRequest {
  otpId: string;
  otpCode: string;
  publicKey: string; // Ephemeral public key (uncompressed, 130 hex chars)
}

interface StartSessionResponse {
  success: boolean;
  data: {
    credentialBundle: string; // HPKE encrypted bundle
  };
}

// Prepare Wallet
interface PrepareWalletRequest {
  walletName: string;
  chain: string;
}

interface PrepareWalletResponse {
  success: boolean;
  data: {
    payloadId: string;
    payloadToSign: string;
    rpId: string;
  };
}

// Submit Wallet
interface SubmitWalletRequest {
  payloadId: string;
  signature: string;
  signatureType?: string;
}

interface WalletAccountData {
  address: string;
  curve: string;
  pathFormat: string;
  path: string;
  addressFormat: string;
}

interface SubmitWalletResponse {
  success: boolean;
  data: {
    walletId: string;
    addresses: string[];
    accounts?: WalletAccountData[];
  };
}

// Get Wallet
interface GetWalletResponse {
  success: boolean;
  data: {
    walletId: string;
    walletName: string;
    chain: string;
    status: string;
    accounts: WalletAccountData[];
  };
}

// Get Balances
interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdValue?: string;
}

interface GetBalancesResponse {
  success: boolean;
  data: {
    balances: TokenBalance[];
  };
}

// Get Transactions
interface Transaction {
  hash: string;
  type: string;
  status: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  tokenSymbol?: string;
  fee?: string;
}

interface GetTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    total: number;
  };
}

// ============================================
// Repository Class
// ============================================

class ZynkWalletRepository {
  /**
   * Handle Zynk API errors consistently
   */
  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof AxiosError && error.response) {
      const zynkError = error.response.data as ZynkErrorResponse;

      if (zynkError?.error) {
        const errorMessage =
          zynkError.error.details || zynkError.error.message;
        throw new Error(zynkError.error.code, errorMessage);
      }

      throw new Error(error.response.status, defaultMessage);
    }

    throw new Error(500, "Failed to connect to Zynk API");
  }

  /**
   * Register email-based authentication with Zynk
   * This automatically initiates OTP
   */
  async registerAuth(entityId: string): Promise<RegisterAuthResponse> {
    try {
      const response = await zynkClient.post<RegisterAuthResponse>(
        `/api/v1/wallets/${entityId}/register-auth`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to register auth");
    }
  }

  /**
   * Initiate OTP for wallet operations
   */
  async initiateOtp(entityId: string): Promise<InitiateOtpResponse> {
    try {
      const response = await zynkClient.post<InitiateOtpResponse>(
        `/api/v1/wallets/${entityId}/initiate-otp`
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to initiate OTP");
    }
  }

  /**
   * Start session with OTP verification and HPKE handshake
   * Returns encrypted credential bundle
   */
  async startSession(
    entityId: string,
    data: StartSessionRequest
  ): Promise<StartSessionResponse> {
    try {
      const response = await zynkClient.post<StartSessionResponse>(
        `/api/v1/wallets/${entityId}/start-session`,
        data
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        throw new Error(401, "Invalid or expired OTP code");
      }
      this.handleError(error, "Failed to start session");
    }
  }

  /**
   * Prepare wallet creation - get payload to sign
   */
  async prepareWallet(
    entityId: string,
    data: PrepareWalletRequest
  ): Promise<PrepareWalletResponse> {
    try {
      const response = await zynkClient.post<PrepareWalletResponse>(
        `/api/v1/wallets/${entityId}/create/prepare`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to prepare wallet creation");
    }
  }

  /**
   * Submit wallet creation with signature
   */
  async submitWallet(data: SubmitWalletRequest): Promise<SubmitWalletResponse> {
    try {
      const response = await zynkClient.post<SubmitWalletResponse>(
        `/api/v1/wallets/create/submit`,
        {
          ...data,
          signatureType: data.signatureType || "ApiKey",
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to submit wallet creation");
    }
  }

  /**
   * Get wallet details from Zynk
   */
  async getWallet(walletId: string): Promise<GetWalletResponse> {
    try {
      const response = await zynkClient.get<GetWalletResponse>(
        `/api/v1/wallets/${walletId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new Error(404, "Wallet not found");
      }
      this.handleError(error, "Failed to get wallet details");
    }
  }

  /**
   * Get wallet token balances
   */
  async getBalances(walletId: string): Promise<GetBalancesResponse> {
    try {
      const response = await zynkClient.get<GetBalancesResponse>(
        `/api/v1/wallets/${walletId}/balances`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new Error(404, "Wallet not found");
      }
      this.handleError(error, "Failed to get wallet balances");
    }
  }

  /**
   * Get transaction history for a specific address
   */
  async getTransactions(
    walletId: string,
    address: string,
    options?: { limit?: number; offset?: number }
  ): Promise<GetTransactionsResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      const queryString = params.toString();
      const url = `/api/v1/wallets/${walletId}/${address}/transactions${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await zynkClient.get<GetTransactionsResponse>(url);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new Error(404, "Wallet or address not found");
      }
      this.handleError(error, "Failed to get transactions");
    }
  }
}

export default new ZynkWalletRepository();
export type {
  RegisterAuthResponse,
  InitiateOtpResponse,
  StartSessionRequest,
  StartSessionResponse,
  PrepareWalletRequest,
  PrepareWalletResponse,
  SubmitWalletRequest,
  SubmitWalletResponse,
  GetWalletResponse,
  GetBalancesResponse,
  GetTransactionsResponse,
  WalletAccountData,
  TokenBalance,
  Transaction,
};
