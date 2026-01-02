import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import AppError from "../lib/Error";
import type { AuthRequest } from "../middlewares/auth";
import walletService from "../services/wallet.service";
import {
  getTransactionsQuerySchema,
  submitWalletSchema,
} from "../schemas/wallet.schema";

class WalletController {

  async prepareWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await walletService.prepareWallet(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Please sign the payload to create a wallet", result));
    } catch (error) {
      next(error);
    }
  }

  async submitWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = submitWalletSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const wallet = await walletService.submitWallet(req.user.id, value.payloadId, value.signature);

      res.status(200).json(new APIResponse(true, "Wallet created successfully", wallet));
    } catch (error) {
      next(error);
    }
  }
  
  async prepareAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await walletService.prepareAccount(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Please sign the payload to create an account", result));
    } catch (error) {
      next(error);
    }
  }

  async submitAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = submitWalletSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const account = await walletService.submitAccount(req.user.id, value.payloadId, value.signature);

      res.status(200).json(new APIResponse(true, "Account created successfully", account));
    } catch (error) {
      next(error);
    }
  }

  async getWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const wallet = await walletService.getWallet(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Wallet retrieved successfully", wallet));
    } catch (error) {
      next(error);
    }
  }
  
  async getTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = getTransactionsQuerySchema.validate(req.query, {
        abortEarly: false,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const result = await walletService.getTransactions(req.user.id, {
        limit: value.limit,
        offset: value.offset,
      });

      res
        .status(200)
        .json(
          new APIResponse(true, "Transactions retrieved successfully", result)
        );
    } catch (error) {
      next(error);
    }
  }
}

export default new WalletController();
