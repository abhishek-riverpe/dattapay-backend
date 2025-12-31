import prismaClient from "../lib/prisma-client";
import type { WalletStatus } from "../generated/prisma/client";

// ============================================
// Input Types
// ============================================

interface CreateWalletInput {
  userId: string;
  zynkWalletId: string;
  walletName?: string;
  chain?: string;
}

interface CreateWalletAccountInput {
  walletId: string;
  address: string;
  curve?: string;
  pathFormat?: string;
  path: string;
  addressFormat?: string;
}

// ============================================
// Repository Class
// ============================================

class WalletRepository {
  // ============================================
  // Wallet Operations
  // ============================================

  async findWalletByUserId(userId: string) {
    return prismaClient.wallet.findUnique({
      where: { userId },
      include: { account: true },
    });
  }

  async findWalletById(id: string) {
    return prismaClient.wallet.findUnique({
      where: { id },
      include: { account: true },
    });
  }

  async findWalletByZynkId(zynkWalletId: string) {
    return prismaClient.wallet.findUnique({
      where: { zynkWalletId },
      include: { account: true },
    });
  }

  async createWallet(data: CreateWalletInput) {
    return prismaClient.wallet.create({
      data: {
        userId: data.userId,
        zynkWalletId: data.zynkWalletId,
        walletName: data.walletName || "Primary Wallet",
        chain: data.chain || process.env.DEFAULT_WALLET_CHAIN || "SOLANA",
      },
      include: { account: true },
    });
  }

  async updateWalletStatus(id: string, status: WalletStatus) {
    return prismaClient.wallet.update({
      where: { id },
      data: { status },
      include: { account: true },
    });
  }

  // ============================================
  // Wallet Account Operations
  // ============================================

  async findAccountByWalletId(walletId: string) {
    return prismaClient.walletAccount.findUnique({
      where: { walletId },
    });
  }

  async findAccountByAddress(address: string) {
    return prismaClient.walletAccount.findUnique({
      where: { address },
    });
  }

  async createWalletAccount(data: CreateWalletAccountInput) {
    return prismaClient.walletAccount.create({
      data: {
        walletId: data.walletId,
        address: data.address,
        curve: data.curve || "CURVE_ED25519",
        pathFormat: data.pathFormat || "PATH_FORMAT_BIP32",
        path: data.path,
        addressFormat: data.addressFormat || "ADDRESS_FORMAT_SOLANA",
      },
    });
  }

  // ============================================
  // Wallet + Account Creation (Transaction)
  // ============================================

  async createWalletWithAccount(
    walletData: CreateWalletInput,
    accountData: Omit<CreateWalletAccountInput, "walletId">
  ) {
    return prismaClient.$transaction(async (tx) => {
      const wallet = await tx.wallet.create({
        data: {
          userId: walletData.userId,
          zynkWalletId: walletData.zynkWalletId,
          walletName: walletData.walletName || "Primary Wallet",
          chain: walletData.chain || process.env.DEFAULT_WALLET_CHAIN || "SOLANA",
        },
      });

      const account = await tx.walletAccount.create({
        data: {
          walletId: wallet.id,
          address: accountData.address,
          curve: accountData.curve || "CURVE_ED25519",
          pathFormat: accountData.pathFormat || "PATH_FORMAT_BIP32",
          path: accountData.path,
          addressFormat: accountData.addressFormat || "ADDRESS_FORMAT_SOLANA",
        },
      });

      return {
        ...wallet,
        account,
      };
    });
  }
}

export default new WalletRepository();
export type { CreateWalletInput, CreateWalletAccountInput };
