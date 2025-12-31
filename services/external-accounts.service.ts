import Error from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import type { CreateExternalAccountInput } from "../schemas/external-accounts.schema";

class ExternalAccountsService {
  async create(userId: string, data: CreateExternalAccountInput) {
    // Initial validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User must have a Zynk entity to add external accounts"
      );
    }

    // Call external API first (cannot be rolled back)
    const zynkResponse = await externalAccountsRepository.createExternalAccountInZynk(
      user.zynkEntityId,
      data.walletAddress,
      { type: data.type, walletId: data.walletId }
    );

    // Wrap check + create in transaction to prevent race conditions
    return prismaClient.$transaction(async (tx) => {
      const existingAccount = await tx.externalAccount.findFirst({
        where: {
          userId,
          walletAddress: data.walletAddress,
          deleted_at: null,
        },
      });

      if (existingAccount) {
        throw new Error(409, "External account with this address already exists");
      }

      return tx.externalAccount.create({
        data: {
          userId,
          walletAddress: data.walletAddress,
          label: data.label,
          zynkExternalAccountId: zynkResponse.data.accountId,
          type: data.type,
          walletId: data.walletId,
        },
      });
    });
  }

  async list(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    const externalAccounts = await externalAccountsRepository.findAllByUserId(userId);

    return externalAccounts;
  }

  async getById(userId: string, id: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    const externalAccount = await externalAccountsRepository.findById(id, userId);

    if (!externalAccount) {
      throw new Error(404, "External account not found");
    }

    return externalAccount;
  }

  async delete(userId: string, id: string) {
    // Initial validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(400, "User does not have a Zynk entity");
    }

    const externalAccount = await externalAccountsRepository.findById(id, userId);

    if (!externalAccount) {
      throw new Error(404, "External account not found");
    }

    // Call external API first (cannot be rolled back)
    if (externalAccount.zynkExternalAccountId) {
      await externalAccountsRepository.deleteExternalAccountFromZynk(
        user.zynkEntityId,
        externalAccount.zynkExternalAccountId
      );
    }

    // Wrap check + soft-delete in transaction
    await prismaClient.$transaction(async (tx) => {
      const account = await tx.externalAccount.findFirst({
        where: { id, userId, deleted_at: null },
      });

      if (!account) {
        throw new Error(404, "External account not found");
      }

      await tx.externalAccount.update({
        where: { id },
        data: { deleted_at: new Date(), status: "INACTIVE" },
      });
    });

    return null;
  }
}

export default new ExternalAccountsService();
