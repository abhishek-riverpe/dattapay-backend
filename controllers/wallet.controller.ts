import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import Error from "../lib/Error";
import type { AuthRequest } from "../middlewares/auth";
import walletService from "../services/wallet.service";
import {
  verifySessionSchema,
  createWalletSchema,
  getTransactionsQuerySchema,
} from "../schemas/wallet.schema";

class WalletController {
  async initiateSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await walletService.initiateSession(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "OTP sent successfully", result));
    } catch (error) {
      next(error);
    }
  }

  async verifySession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = verifySessionSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const result = await walletService.verifySession(req.user.id, value);
      res
        .status(200)
        .json(new APIResponse(true, "Session verified successfully", result));
    } catch (error) {
      next(error);
    }
  }

  async createWallet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = createWalletSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const result = await walletService.createWallet(req.user.id, value);

      const message = result.isExisting
        ? "Wallet already exists"
        : "Wallet created successfully";
      const statusCode = result.isExisting ? 200 : 201;

      res.status(statusCode).json(new APIResponse(true, message, result));
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

  async getBalances(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await walletService.getBalances(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "Balances retrieved successfully", result));
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
        throw new Error(400, error.details.map((d) => d.message).join(", "));
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
