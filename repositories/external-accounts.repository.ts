import { AxiosError } from "axios";
import prismaClient from "../lib/prisma-client";
import zynkClient from "../lib/zynk-client";
import Error from "../lib/Error";
import type { ExternalAccountStatus } from "../generated/prisma/client";

// ============================================
// Input Types
// ============================================

interface CreateExternalAccountInput {
  userId: number;
  walletAddress: string;
  label?: string;
  zynkExternalAccountId?: string;
  type?: string;
  walletId?: string;
}

interface ZynkExternalAccountData {
  jurisdictionID: string;
  type: string;
  ownershipType: string;
  wallet: {
    walletId?: string;
    walletAddress: string;
  };
}

interface ZynkExternalAccountResponse {
  success: boolean;
  data: {
    message: string;
    accountId: string;
  };
}

interface ZynkGetExternalAccountResponse {
  success: boolean;
  data: {
    id: string;
    entityId: string;
    walletAddress: string;
    status: string;
  };
}

interface ZynkErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details: string;
  };
}

// ============================================
// Repository Class
// ============================================

class ExternalAccountsRepository {
  // ============================================
  // Local Database Operations
  // ============================================

  async findById(id: number, userId: number) {
    return prismaClient.externalAccount.findFirst({
      where: {
        id,
        userId,
        deleted_at: null,
      },
    });
  }

  async findByWalletAddress(walletAddress: string, userId: number) {
    return prismaClient.externalAccount.findFirst({
      where: {
        walletAddress,
        userId,
        deleted_at: null,
      },
    });
  }

  async findAllByUserId(userId: number) {
    return prismaClient.externalAccount.findMany({
      where: {
        userId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  async findNonCustodialWallet(userId: number) {
    return prismaClient.externalAccount.findFirst({
      where: {
        userId,
        type: "non_custodial_wallet",
        deleted_at: null,
      },
    });
  }

  async create(data: CreateExternalAccountInput) {
    return prismaClient.externalAccount.create({
      data: {
        userId: data.userId,
        walletAddress: data.walletAddress,
        label: data.label,
        zynkExternalAccountId: data.zynkExternalAccountId,
        type: data.type || "withdrawal",
        walletId: data.walletId,
        status: "ACTIVE",
      },
    });
  }

  async updateStatus(id: number, status: ExternalAccountStatus) {
    return prismaClient.externalAccount.update({
      where: { id },
      data: { status },
    });
  }

  async updateZynkAccountId(id: number, zynkExternalAccountId: string) {
    return prismaClient.externalAccount.update({
      where: { id },
      data: { zynkExternalAccountId },
    });
  }

  async softDelete(id: number) {
    return prismaClient.externalAccount.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  // ============================================
  // Zynk API Operations
  // ============================================

  async createExternalAccountInZynk(
    entityId: string,
    walletAddress: string,
    options?: { type?: string; walletId?: string }
  ): Promise<ZynkExternalAccountResponse> {
    const jurisdictionId = process.env.SOLANA_JURISDICTION_ID;

    if (!jurisdictionId) {
      throw new Error(500, "SOLANA_JURISDICTION_ID is not configured");
    }

    const payload: ZynkExternalAccountData = {
      jurisdictionID: jurisdictionId,
      type: options?.type || "withdrawal",
      ownershipType: "first_party",
      wallet: {
        ...(options?.walletId && { walletId: options.walletId }),
        walletAddress: walletAddress,
      },
    };

    try {
      const response = await zynkClient.post<ZynkExternalAccountResponse>(
        `/api/v1/transformer/accounts/${encodeURIComponent(entityId)}/add/external_account`,
        payload
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(
          error.response.status,
          "Failed to create external account in Zynk"
        );
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }

  async getExternalAccountFromZynk(
    entityId: string,
    accountId: string
  ): Promise<ZynkGetExternalAccountResponse> {
    try {
      const response = await zynkClient.get<ZynkGetExternalAccountResponse>(
        `/api/v1/transformer/accounts/${encodeURIComponent(entityId)}/external_account/${encodeURIComponent(accountId)}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(
          error.response.status,
          "Failed to get external account from Zynk"
        );
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }

  async deleteExternalAccountFromZynk(
    entityId: string,
    accountId: string
  ): Promise<void> {
    try {
      await zynkClient.delete(
        `/api/v1/transformer/accounts/${encodeURIComponent(entityId)}/delete/external_account/${encodeURIComponent(accountId)}`
      );
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(
          error.response.status,
          "Failed to delete external account from Zynk"
        );
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }
}

export default new ExternalAccountsRepository();
export type {
  CreateExternalAccountInput,
  ZynkExternalAccountData,
  ZynkExternalAccountResponse,
  ZynkGetExternalAccountResponse,
};
