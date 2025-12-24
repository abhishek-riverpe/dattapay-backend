import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import Error from "../lib/Error";
import type { AuthRequest } from "../middlewares/auth";
import teleportService from "../services/teleport.service";
import {
  createTeleportSchema,
  updateTeleportSchema,
} from "../schemas/teleport.schema";

class TeleportController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = createTeleportSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const teleport = await teleportService.create(req.user.id, value);

      res
        .status(201)
        .json(new APIResponse(true, "Teleport created successfully", teleport));
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teleport = await teleportService.get(req.user.id);

      res
        .status(200)
        .json(
          new APIResponse(true, "Teleport retrieved successfully", teleport)
        );
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = updateTeleportSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const teleport = await teleportService.update(req.user.id, value);

      res
        .status(200)
        .json(new APIResponse(true, "Teleport updated successfully", teleport));
    } catch (error) {
      next(error);
    }
  }
}

export default new TeleportController();
