import prismaClient from "../lib/prisma-client";
import type { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";

class UserRepository {
  async findAll() {
    return prismaClient.user.findMany({
      include: { addresse: true },
    });
  }

  async findById(id: number) {
    return prismaClient.user.findUnique({
      where: { id },
      include: { addresse: true },
    });
  }

  async findByEmail(email: string) {
    return prismaClient.user.findUnique({
      where: { email },
      include: { addresse: true },
    });
  }

  async findByClerkUserId(clerkUserId: string) {
    return prismaClient.user.findFirst({
      where: { clerkUserId },
      include: { addresse: true },
    });
  }

  async create(data: CreateUserInput) {
    return prismaClient.user.create({
      data,
      include: { addresse: true },
    });
  }

  async update(id: number, data: UpdateUserInput) {
    return prismaClient.user.update({
      where: { id },
      data,
      include: { addresse: true },
    });
  }

  async delete(id: number) {
    return prismaClient.user.delete({
      where: { id },
    });
  }
}

export default new UserRepository();
