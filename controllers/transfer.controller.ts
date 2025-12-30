import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import Error from "../lib/Error";
import type { AuthRequest } from "../middlewares/auth";
import transferService from "../services/transfer.service";
import { simulateTransferSchema, transferSchema } from "../schemas/transfer.schema";

class TransferController {
  async simulateTransfer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = simulateTransferSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const result = await transferService.simulateTransfer(req.user.id, value);

      res
        .status(200)
        .json(new APIResponse(true, "Transfer simulation successful", result));
    } catch (error) {
      next(error);
    }
  }

  async transfer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = transferSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const result = await transferService.transfer(value);

      res
        .status(200)
        .json(new APIResponse(true, result.message, { executionId: result.executionId }));
    } catch (error) {
      next(error);
    }
  }
}

export default new TransferController();
