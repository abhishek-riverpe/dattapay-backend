import { AxiosError } from "axios";
import prismaClient from "../lib/prisma-client";
import zynkClient from "../lib/zynk-client";
import Error from "../lib/Error";

// ============================================
// Input Types
// ============================================

interface CreateTeleportInput {
  userId: string;
  externalAccountId: string;
  zynkTeleportId?: string;
}

interface UpdateTeleportInput {
  externalAccountId: string;
  zynkTeleportId: string;
}

interface ZynkTeleportPayload {
  fundingAccountId: string;
  externalAccountId: string;
}

interface ZynkTeleportResponse {
  success: boolean;
  data: {
    message: string;
    teleportId: string;
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

class TeleportRepository {
  // ============================================
  // Local Database Operations
  // ============================================

  async findByUserId(userId: string) {
    return prismaClient.teleport.findUnique({
      where: { userId },
      include: {
        externalAccount: true,
      },
    });
  }

  async findById(id: string) {
    return prismaClient.teleport.findUnique({
      where: { id },
      include: {
        externalAccount: true,
      },
    });
  }

  async create(data: CreateTeleportInput) {
    return prismaClient.teleport.create({
      data: {
        userId: data.userId,
        externalAccountId: data.externalAccountId,
        zynkTeleportId: data.zynkTeleportId,
        status: "ACTIVE",
      },
      include: {
        externalAccount: true,
      },
    });
  }

  async update(userId: string, data: UpdateTeleportInput) {
    return prismaClient.teleport.update({
      where: { userId },
      data: {
        externalAccountId: data.externalAccountId,
        zynkTeleportId: data.zynkTeleportId,
      },
      include: {
        externalAccount: true,
      },
    });
  }

  // ============================================
  // Zynk API Operations
  // ============================================

  async createTeleportInZynk(
    fundingAccountId: string,
    externalAccountId: string
  ): Promise<ZynkTeleportResponse> {
    const payload: ZynkTeleportPayload = {
      fundingAccountId,
      externalAccountId,
    };

    try {
      const response = await zynkClient.post<ZynkTeleportResponse>(
        "/api/v1/transformer/teleport/create",
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
          "Failed to create teleport in Zynk"
        );
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }
}

export default new TeleportRepository();
export type {
  CreateTeleportInput,
  UpdateTeleportInput,
  ZynkTeleportPayload,
  ZynkTeleportResponse,
};
