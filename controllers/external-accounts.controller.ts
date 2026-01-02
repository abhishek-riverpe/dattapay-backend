import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import AppError from "../lib/AppError";
import type { AuthRequest } from "../middlewares/auth";
import externalAccountsService from "../services/external-accounts.service";
import {
  createExternalAccountSchema,
  externalAccountIdSchema,
} from "../schemas/external-accounts.schema";

class ExternalAccountsController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = createExternalAccountSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const externalAccount = await externalAccountsService.create(
        req.user.id,
        value
      );

      res
        .status(201)
        .json(
          new APIResponse(
            true,
            "External account created successfully",
            externalAccount
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const externalAccounts = await externalAccountsService.list(req.user.id);

      res
        .status(200)
        .json(
          new APIResponse(
            true,
            "External accounts retrieved successfully",
            externalAccounts
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = externalAccountIdSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const externalAccount = await externalAccountsService.getById(
        req.user.id,
        value.id
      );

      res
        .status(200)
        .json(
          new APIResponse(
            true,
            "External account retrieved successfully",
            externalAccount
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = externalAccountIdSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      await externalAccountsService.delete(req.user.id, value.id);

      res
        .status(200)
        .json(
          new APIResponse(true, "External account deleted successfully", null)
        );
    } catch (error) {
      next(error);
    }
  }
}

export default new ExternalAccountsController();
