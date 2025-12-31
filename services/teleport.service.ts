import Error from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import teleportRepository from "../repositories/teleport.repository";
import type { CreateTeleportInput, UpdateTeleportInput } from "../schemas/teleport.schema";

class TeleportService {
  private async validateAndCallZynkApi(userId: string, externalAccountId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(400, "User must have a Zynk entity");
    }

    if (!user.zynkFundingAccountId) {
      throw new Error(400, "User must have a funding account");
    }

    const externalAccount = await externalAccountsRepository.findById(
      externalAccountId,
      userId
    );

    if (!externalAccount) {
      throw new Error(404, "External account not found");
    }

    if (!externalAccount.zynkExternalAccountId) {
      throw new Error(400, "External account not registered with Zynk");
    }

    const zynkResponse = await teleportRepository.createTeleportInZynk(
      user.zynkFundingAccountId,
      externalAccount.zynkExternalAccountId
    );

    return zynkResponse;
  }

  async create(userId: string, data: CreateTeleportInput) {
    const zynkResponse = await this.validateAndCallZynkApi(userId, data.externalAccountId);

    return prismaClient.$transaction(async (tx) => {
      const existingTeleport = await tx.teleport.findUnique({
        where: { userId },
      });

      if (existingTeleport) {
        throw new Error(409, "User already has a teleport");
      }

      return tx.teleport.create({
        data: {
          userId,
          externalAccountId: data.externalAccountId,
          zynkTeleportId: zynkResponse.data.teleportId,
        },
        include: { externalAccount: true },
      });
    });
  }

  async get(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    const teleport = await teleportRepository.findByUserId(userId);
    if (!teleport) {
      throw new Error(404, "Teleport not found");
    }

    return teleport;
  }

  async update(userId: string, data: UpdateTeleportInput) {
    const zynkResponse = await this.validateAndCallZynkApi(userId, data.externalAccountId);

    return prismaClient.$transaction(async (tx) => {
      const existingTeleport = await tx.teleport.findUnique({
        where: { userId },
      });

      if (!existingTeleport) {
        throw new Error(404, "Teleport not found");
      }

      return tx.teleport.update({
        where: { userId },
        data: {
          externalAccountId: data.externalAccountId,
          zynkTeleportId: zynkResponse.data.teleportId,
        },
        include: { externalAccount: true },
      });
    });
  }
}

export default new TeleportService();
