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
  /**
   * POST /wallets/session/initiate
   * Initiate wallet session - sends OTP to user's email
   */
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

  /**
   * POST /wallets/session/verify
   * Verify OTP and establish session
   */
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

  /**
   * POST /wallets
   * Create wallet (or return existing)
   */
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

  /**
   * GET /wallets
   * Get user's wallet with account details
   */
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

  /**
   * GET /wallets/balances
   * Get wallet token balances
   */
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

  /**
   * GET /wallets/transactions
   * Get transaction history
   */
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
