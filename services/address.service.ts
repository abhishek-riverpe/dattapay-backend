import Error from "../lib/Error";
import addressRepository from "../repositories/address.repository";
import userRepository from "../repositories/user.repository";
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
    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    const existingAddress = await addressRepository.findByUserId(data.userId);
    if (existingAddress) {
      throw new Error(409, "User already has an address");
    }

    return addressRepository.create(data);
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
