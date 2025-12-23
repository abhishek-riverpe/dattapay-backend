import prismaClient from "../lib/prisma-client";
import type { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";

class UserRepository {
  async findAll() {
    return prismaClient.user.findMany({
      include: { address: true },
    });
  }

  async findById(id: number) {
    return prismaClient.user.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  async findByEmail(email: string) {
    return prismaClient.user.findUnique({
      where: { email },
      include: { address: true },
    });
  }

  async findByClerkUserId(clerkUserId: string) {
    return prismaClient.user.findFirst({
      where: { clerkUserId },
      include: { address: true },
    });
  }

  async create(data: CreateUserInput) {
    return prismaClient.user.create({
      data,
      include: { address: true },
    });
  }

  async update(id: number, data: UpdateUserInput) {
    return prismaClient.user.update({
      where: { id },
      data,
      include: { address: true },
    });
  }

  async delete(id: number) {
    return prismaClient.user.delete({
      where: { id },
    });
  }

  async updateWithTransaction(
    id: number,
    data: UpdateUserInput,
    tx: typeof prismaClient
  ) {
    return tx.user.update({
      where: { id },
      data,
      include: { address: true },
    });
  }
}

export default new UserRepository();
