import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import Error from "../lib/Error";
import type { AuthRequest } from "../middlewares/auth";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../schemas/address.schema";
import addressService from "../services/address.service";

class AddressController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const addresses = await addressService.getAll();
      res
        .status(200)
        .json(
          new APIResponse(true, "Addresses retrieved successfully", addresses)
        );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const address = await addressService.getById(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Address retrieved successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async getByUserId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const address = await addressService.getByUserId(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Address retrieved successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = createAddressSchema.validate(
        { ...req.body, userId: req.user.id },
        {
          abortEarly: false,
        }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.create(value);
      res
        .status(201)
        .json(new APIResponse(true, "Address created successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error: bodyError, value: bodyValue } =
        updateAddressSchema.validate(req.body, { abortEarly: false });

      if (bodyError) {
        throw new Error(
          400,
          bodyError.details.map((d) => d.message).join(", ")
        );
      }

      const address = await addressService.update(req.user.id, bodyValue);
      res
        .status(200)
        .json(new APIResponse(true, "Address updated successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async updateByUserId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error: bodyError, value: bodyValue } =
        updateAddressSchema.validate(req.body, { abortEarly: false });

      if (bodyError) {
        throw new Error(
          400,
          bodyError.details.map((d) => d.message).join(", ")
        );
      }
      const address = await addressService.updateByUserId(
        req.user.id,
        bodyValue
      );
      res
        .status(200)
        .json(new APIResponse(true, "Address updated successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await addressService.delete(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Address deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteByUserId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await addressService.deleteByUserId(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Address deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export default new AddressController();
