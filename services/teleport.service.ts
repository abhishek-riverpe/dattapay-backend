import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import teleportRepository from "../repositories/teleport.repository";
import type { CreateTeleportInput, UpdateTeleportInput } from "../schemas/teleport.schema";

class TeleportService {
  async create(userId: number, data: CreateTeleportInput) {
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

    const existingTeleport = await teleportRepository.findByUserId(userId);
    if (existingTeleport) {
      throw new Error(409, "User already has a teleport");
    }

    const externalAccount = await externalAccountsRepository.findById(
      data.externalAccountId,
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

    const teleport = await teleportRepository.create({
      userId,
      externalAccountId: data.externalAccountId,
      zynkTeleportId: zynkResponse.data.teleportId,
    });

    return teleport;
  }

  async get(userId: number) {
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

  async update(userId: number, data: UpdateTeleportInput) {
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

    const existingTeleport = await teleportRepository.findByUserId(userId);
    if (!existingTeleport) {
      throw new Error(404, "Teleport not found");
    }

    const externalAccount = await externalAccountsRepository.findById(
      data.externalAccountId,
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

    const teleport = await teleportRepository.update(userId, {
      externalAccountId: data.externalAccountId,
      zynkTeleportId: zynkResponse.data.teleportId,
    });

    return teleport;
  }
}

export default new TeleportService();
