import Error from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import addressRepository from "../repositories/address.repository";
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../schemas/address.schema";

class AddressService {
  async getAll() {
    return addressRepository.findAll();
  }

  async getById(id: number) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new Error(404, "Address not found");
    }
    return address;
  }

  async getByUserId(userId: number) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new Error(404, "Address not found for this user");
    }
    return address;
  }

  async create(data: CreateAddressInput) {
    return prismaClient.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new Error(404, "User not found");
      }

      const existingAddress = await tx.address.findUnique({
        where: { userId: data.userId },
      });

      if (existingAddress) {
        throw new Error(409, "User already has an address");
      }

      return tx.address.create({
        data,
        include: { user: true },
      });
    });
  }

  async update(id: number, data: UpdateAddressInput) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new Error(404, "Address not found");
    }
    return addressRepository.update(id, data);
  }

  async updateByUserId(userId: number, data: UpdateAddressInput) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new Error(404, "Address not found for this user");
    }
    return addressRepository.updateByUserId(userId, data);
  }

  async delete(id: number) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new Error(404, "Address not found");
    }
    return addressRepository.delete(id);
  }

  async deleteByUserId(userId: number) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new Error(404, "Address not found for this user");
    }
    return addressRepository.deleteByUserId(userId);
  }
}

export default new AddressService();
