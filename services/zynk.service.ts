import Error from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import userRepository from "../repositories/user.repository";
import zynkRepository from "../repositories/zynk.repository";
import type { ZynkEntityData } from "../repositories/zynk.repository";

class ZynkService {
  async createEntity(userId: number) {
    // Initial validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.address) {
      throw new Error(400, "User must have an address to create a Zynk entity");
    }

    if (!user.publicKey) {
      throw new Error(400, "User does not have a public key");
    }

    const entityData: ZynkEntityData = {
      type: "individual",
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumberPrefix: user.phoneNumberPrefix,
      phoneNumber: user.phoneNumber,
      nationality: user.nationality,
      dateOfBirth: user.dateOfBirth.toISOString().split("T")[0] as string,
      permanentAddress: {
        addressLine1: user.address.addressLine1,
        addressLine2: user.address.addressLine2 || undefined,
        locality: user.address.locality,
        city: user.address.city,
        state: user.address.state,
        country: user.address.country,
        postalCode: user.address.postalCode,
      },
    };

    // Call external API first (cannot be rolled back)
    const response = await zynkRepository.createEntity(entityData);

    // Wrap check + update in transaction to prevent race conditions
    const updatedUser = await prismaClient.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        include: { address: true },
      });

      if (!currentUser) {
        throw new Error(404, "User not found");
      }

      if (currentUser.zynkEntityId) {
        throw new Error(409, "User already has a Zynk entity");
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          zynkEntityId: response.data.entityId,
          accountStatus: "PENDING",
        },
        include: { address: true },
      });
    });

    await zynkRepository.registerPrimaryAuth(response.data.entityId, user.publicKey);
    return updatedUser;
  }

  async startKyc(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    const response = await zynkRepository.startKyc(user.zynkEntityId);

    return response.data;
  }

  async getKycStatus(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    const response = await zynkRepository.getKycStatus(user.zynkEntityId);

    return response.data;
  }

  async createFundingAccount(userId: number) {
    // Initial validation
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    // Call external API first (cannot be rolled back)
    const response = await zynkRepository.createFundingAccount(
      user.zynkEntityId
    );

    // Wrap check + update in transaction to prevent race conditions
    const updatedUser = await prismaClient.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        include: { address: true },
      });

      if (!currentUser) {
        throw new Error(404, "User not found");
      }

      if (currentUser.zynkFundingAccountId) {
        throw new Error(409, "User already has a funding account");
      }

      return tx.user.update({
        where: { id: userId },
        data: { zynkFundingAccountId: response.data.data.id },
        include: { address: true },
      });
    });

    return {
      user: updatedUser,
      fundingAccount: response.data.data,
    };
  }

  async getFundingAccount(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    if (!user.zynkFundingAccountId) {
      throw new Error(
        400,
        "User does not have a funding account. Create funding account first."
      );
    }

    const response = await zynkRepository.getFundingAccount(
      user.zynkEntityId,
      user.zynkFundingAccountId
    );

    return response.data;
  }

  async activateFundingAccount(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    if (!user.zynkFundingAccountId) {
      throw new Error(
        400,
        "User does not have a funding account. Create funding account first."
      );
    }

    const response = await zynkRepository.activateFundingAccount(
      user.zynkEntityId,
      user.zynkFundingAccountId
    );

    return response.data.data;
  }

  async deactivateFundingAccount(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(
        400,
        "User does not have a Zynk entity. Create entity first."
      );
    }

    if (!user.zynkFundingAccountId) {
      throw new Error(
        400,
        "User does not have a funding account. Create funding account first."
      );
    }

    const response = await zynkRepository.deactivateFundingAccount(
      user.zynkEntityId,
      user.zynkFundingAccountId
    );

    return response.data.data;
  }

  async registerPrimaryAuth(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(400, "User does not have a Zynk entity. Create entity first.");
    }

    if (!user.publicKey) {
      throw new Error(400, "User does not have a public key");
    }
  
    const response = await zynkRepository.registerPrimaryAuth(user.zynkEntityId, user.publicKey);
    return response;
  }

}

export default new ZynkService();
