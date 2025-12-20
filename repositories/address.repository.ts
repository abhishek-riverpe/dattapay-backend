import prismaClient from "../lib/prisma-client";
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../schemas/address.schema";

class AddressRepository {
  async findAll() {
    return prismaClient.address.findMany({
      include: { user: true },
    });
  }

  async findById(id: number) {
    return prismaClient.address.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByUserId(userId: number) {
    return prismaClient.address.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  async create(data: CreateAddressInput) {
    return prismaClient.address.create({
      data,
      include: { user: true },
    });
  }

  async update(id: number, data: UpdateAddressInput) {
    return prismaClient.address.update({
      where: { id },
      data,
      include: { user: true },
    });
  }

  async updateByUserId(userId: number, data: UpdateAddressInput) {
    return prismaClient.address.update({
      where: { userId },
      data,
      include: { user: true },
    });
  }

  async delete(id: number) {
    return prismaClient.address.delete({
      where: { id },
    });
  }

  async deleteByUserId(userId: number) {
    return prismaClient.address.delete({
      where: { userId },
    });
  }
}

export default new AddressRepository();
