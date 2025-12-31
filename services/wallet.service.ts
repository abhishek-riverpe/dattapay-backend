import CustomError from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import userRepository from "../repositories/user.repository";
import walletRepository from "../repositories/wallet.repository";
import zynkWalletRepository from "../repositories/zynk-wallet.repository";
import externalAccountsService from "./external-accounts.service";

class WalletService {

  async prepareWallet(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new CustomError(400, "User must complete KYC before creating a wallet");
    }

    const existingWallet = await walletRepository.findWalletByUserId(userId);
    if (existingWallet) {
      throw new CustomError(400, "User already has a wallet");
    }

    const prepareWalletResponse = await zynkWalletRepository.prepareWallet(
      user.zynkEntityId,
      { walletName: "My Wallet", chain: process.env.DEFAULT_WALLET_CHAIN || "SOLANA" }
    );

    if (!prepareWalletResponse.data.payloadId || !prepareWalletResponse.data.payloadToSign) {
      throw new CustomError(500, "Failed to prepare wallet creation");
    }

    return {
      payloadId: prepareWalletResponse.data.payloadId,
      payloadToSign: prepareWalletResponse.data.payloadToSign,
    };
  }

  async submitWallet(userId: number, payloadId: string, signature: string) {
    // Initial validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new CustomError(400, "User must complete KYC before creating a wallet");
    }

    // Call external API first (cannot be rolled back)
    const submitWalletResponse = await zynkWalletRepository.submitWallet({
      payloadId,
      signature,
    });

    if (!submitWalletResponse.data.walletId || submitWalletResponse.data.addresses.length === 0) {
      throw new CustomError(500, "Wallet creation failed");
    }

    // Wrap check + create in transaction to prevent race conditions
    return prismaClient.$transaction(async (tx) => {
      const existingWallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (existingWallet) {
        throw new CustomError(400, "User already has a wallet");
      }

      return tx.wallet.create({
        data: {
          userId,
          zynkWalletId: submitWalletResponse.data.walletId,
          walletName: "My Wallet",
          chain: process.env.DEFAULT_WALLET_CHAIN || "SOLANA",
        },
        include: { account: true },
      });
    });
  }

  async prepareAccount(userId: number) {
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    if (wallet.account) {
      throw new CustomError(400, "Wallet already has an account");
    }

    const response = await zynkWalletRepository.prepareAccount(
      wallet.zynkWalletId,
      { chain: process.env.DEFAULT_WALLET_CHAIN || "SOLANA" }
    );

    if (!response.data.payloadId || !response.data.payloadToSign) {
      throw new CustomError(500, "Failed to prepare account creation");
    }

    return {
      payloadId: response.data.payloadId,
      payloadToSign: response.data.payloadToSign,
    };
  }

  async submitAccount(userId: number, payloadId: string, signature: string) {
    // Initial validation
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    // Call external API first (cannot be rolled back)
    const response = await zynkWalletRepository.submitAccount({
      payloadId,
      signature,
    });

    if (!response.data.account?.address) {
      throw new CustomError(500, "Account creation failed");
    }

    // Wrap check + create in transaction to prevent race conditions
    const account = await prismaClient.$transaction(async (tx) => {
      const existingWallet = await tx.wallet.findUnique({
        where: { id: wallet.id },
        include: { account: true },
      });

      if (!existingWallet) {
        throw new CustomError(404, "Wallet not found");
      }

      if (existingWallet.account) {
        throw new CustomError(400, "Wallet already has an account");
      }

      return tx.walletAccount.create({
        data: {
          walletId: wallet.id,
          address: response.data.account.address,
          curve: response.data.account.curve,
          pathFormat: response.data.account.pathFormat,
          path: response.data.account.path,
          addressFormat: response.data.account.addressFormat,
        },
      });
    });

    // Add wallet as external account with label "Dattapay Wallet"
    try {
      await externalAccountsService.create(userId, {
        walletAddress: account.address,
        label: "Dattapay Wallet",
        type: "non_custodial_wallet",
        walletId: wallet.zynkWalletId,
      });
    } catch (error) {
      console.error("Failed to create external account for wallet:", error);
      // Continue - don't fail the whole operation
    }

    return account;
  }

  async getWallet(userId: number) {
    const wallet = await walletRepository.findWalletByUserId(userId);
    if (!wallet) {
      throw new CustomError(404, "Wallet not found. Please create a wallet first.");
    }

    return wallet;
  }

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
