import AppError from "../lib/Error";
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

  async getById(id: string) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new AppError(404, "Address not found");
    }
    return address;
  }

  async getByUserId(userId: string) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new AppError(404, "Address not found for this user");
    }
    return address;
  }

  async create(data: CreateAddressInput) {
    return prismaClient.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const existingAddress = await tx.address.findUnique({
        where: { userId: data.userId },
      });

      if (existingAddress) {
        throw new AppError(409, "User already has an address");
      }

      return tx.address.create({
        data,
        include: { user: true },
      });
    });
  }

  async update(id: string, data: UpdateAddressInput) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new AppError(404, "Address not found");
    }
    return addressRepository.update(id, data);
  }

  async updateByUserId(userId: string, data: UpdateAddressInput) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new AppError(404, "Address not found for this user");
    }
    return addressRepository.updateByUserId(userId, data);
  }

  async delete(id: string) {
    const address = await addressRepository.findById(id);
    if (!address) {
      throw new AppError(404, "Address not found");
    }
    return addressRepository.delete(id);
  }

  async deleteByUserId(userId: string) {
    const address = await addressRepository.findByUserId(userId);
    if (!address) {
      throw new AppError(404, "Address not found for this user");
    }
    return addressRepository.deleteByUserId(userId);
  }
}

export default new AddressService();
