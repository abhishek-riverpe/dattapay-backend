import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import zynkRepository from "../repositories/zynk.repository";
import type { ZynkEntityData } from "../repositories/zynk.repository";

class ZynkService {
  async createEntity(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.address) {
      throw new Error(400, "User must have an address to create a Zynk entity");
    }

    if (user.zynkEntityId) {
      throw new Error(409, "User already has a Zynk entity");
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

    const response = await zynkRepository.createEntity(entityData);

    const updatedUser = await userRepository.update(userId, {
      zynkEntityId: response.data.entityId,
    });

    return updatedUser;
  }
}

export default new ZynkService();
