import AppError from "../lib/Error";
import prismaClient from "../lib/prisma-client";
import userRepository from "../repositories/user.repository";
import type { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";

class UserService {
  async getAll() {
    return userRepository.findAll();
  }

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async getByEmail(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async getByClerkUserId(clerkUserId: string) {
    const user = await userRepository.findByClerkUserId(clerkUserId);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async create(data: CreateUserInput) {
    return prismaClient.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(409, "User with this email already exists");
      }

      return tx.user.create({
        data,
        include: { address: true },
      });
    });
  }

  async update(id: string, data: UpdateUserInput) {
    return prismaClient.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        include: { address: true },
      });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      if (data.email && data.email !== user.email) {
        const existingUser = await tx.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          throw new AppError(409, "User with this email already exists");
        }
      }

      return tx.user.update({
        where: { id },
        data,
        include: { address: true },
      });
    });
  }

  async delete(id: string) {
    return prismaClient.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      return tx.user.delete({
        where: { id },
      });
    });
  }
}

export default new UserService();
