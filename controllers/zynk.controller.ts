import type { Request, Response, NextFunction } from "express";
import zynkService from "../services/zynk.service";
import APIResponse from "../lib/APIResponse";
import { userIdParamSchema } from "../schemas/user.schema";
import Error from "../lib/Error";

class ZynkController {
  async createEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const user = await zynkService.createEntity(value.id);
      res
        .status(201)
        .json(new APIResponse(true, "Zynk entity created successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async startKyc(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const kycData = await zynkService.startKyc(value.id);
      res
        .status(200)
        .json(new APIResponse(true, "KYC started successfully", kycData));
    } catch (error) {
      next(error);
    }
  }

  async getKycStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.userId) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const kycStatus = await zynkService.getKycStatus(value.id);
      res
        .status(200)
        .json(new APIResponse(true, "KYC status retrieved successfully", kycStatus));
    } catch (error) {
      next(error);
    }
  }
}

export default new ZynkController();
