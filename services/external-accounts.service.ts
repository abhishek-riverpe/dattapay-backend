import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import type { CreateExternalAccountInput } from "../schemas/external-accounts.schema";

class ExternalAccountsService {
  async create(userId: number, data: CreateExternalAccountInput) {
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

    const existingAccount = await externalAccountsRepository.findByWalletAddress(
      data.walletAddress,
      userId
    );

    if (existingAccount) {
      throw new Error(409, "External account with this address already exists");
    }

    const zynkResponse = await externalAccountsRepository.createExternalAccountInZynk(
      user.zynkEntityId,
      data.walletAddress
    );

    const externalAccount = await externalAccountsRepository.create({
      userId,
      walletAddress: data.walletAddress,
      label: data.label,
      zynkExternalAccountId: zynkResponse.data.accountId,
    });

    return externalAccount;
  }

  async list(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    const externalAccounts = await externalAccountsRepository.findAllByUserId(userId);

    return externalAccounts;
  }

  async getById(userId: number, id: number) {
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

  async delete(userId: number, id: number) {
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

    if (externalAccount.zynkExternalAccountId) {
      await externalAccountsRepository.deleteExternalAccountFromZynk(
        user.zynkEntityId,
        externalAccount.zynkExternalAccountId
      );
    }

    await externalAccountsRepository.softDelete(id);

    return null;
  }
}

export default new ExternalAccountsService();
