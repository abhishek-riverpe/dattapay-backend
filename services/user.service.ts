import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";

class UserService {
  async getAll() {
    return userRepository.findAll();
  }

  async getById(id: number) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error(404, "User not found");
    }
    return user;
  }

  async getByEmail(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error(404, "User not found");
    }
    return user;
  }

  async getByClerkUserId(clerkUserId: string) {
    const user = await userRepository.findByClerkUserId(clerkUserId);
    if (!user) {
      throw new Error(404, "User not found");
    }
    return user;
  }

  async create(data: CreateUserInput) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error(409, "User with this email already exists");
    }
    return userRepository.create(data);
  }

  async update(id: number, data: UpdateUserInput) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new Error(409, "User with this email already exists");
      }
    }

    return userRepository.update(id, data);
  }

  async delete(id: number) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new Error(404, "User not found");
    }
    return userRepository.delete(id);
  }
}

export default new UserService();
