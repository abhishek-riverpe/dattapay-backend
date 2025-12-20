import type { Request, Response, NextFunction } from "express";
import addressService from "../services/address.service";
import APIResponse from "../lib/APIResponse";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "../schemas/address.schema";
import { userIdParamSchema } from "../schemas/user.schema";
import Error from "../lib/Error";

class AddressController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await addressService.getAll();
      res.status(200).json(new APIResponse(true, "Addresses retrieved successfully", addresses));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = addressIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.getById(value.id);
      res.status(200).json(new APIResponse(true, "Address retrieved successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async getByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.getByUserId(value.id);
      res.status(200).json(new APIResponse(true, "Address retrieved successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createAddressSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.create(value);
      res.status(201).json(new APIResponse(true, "Address created successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { error: paramError, value: paramValue } = addressIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (paramError) {
        throw new Error(400, paramError.details.map((d) => d.message).join(", "));
      }

      const { error: bodyError, value: bodyValue } = updateAddressSchema.validate(
        req.body,
        { abortEarly: false }
      );

      if (bodyError) {
        throw new Error(400, bodyError.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.update(paramValue.id, bodyValue);
      res.status(200).json(new APIResponse(true, "Address updated successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async updateByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { error: paramError, value: paramValue } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (paramError) {
        throw new Error(400, paramError.details.map((d) => d.message).join(", "));
      }

      const { error: bodyError, value: bodyValue } = updateAddressSchema.validate(
        req.body,
        { abortEarly: false }
      );

      if (bodyError) {
        throw new Error(400, bodyError.details.map((d) => d.message).join(", "));
      }

      const address = await addressService.updateByUserId(paramValue.id, bodyValue);
      res.status(200).json(new APIResponse(true, "Address updated successfully", address));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = addressIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      await addressService.delete(value.id);
      res.status(200).json(new APIResponse(true, "Address deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      await addressService.deleteByUserId(value.id);
      res.status(200).json(new APIResponse(true, "Address deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export default new AddressController();
