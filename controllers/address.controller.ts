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
