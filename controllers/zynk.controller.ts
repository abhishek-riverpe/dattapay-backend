import type { NextFunction, Response } from "express";
import APIResponse from "../lib/APIResponse";
import type { AuthRequest } from "../middlewares/auth";
import zynkService from "../services/zynk.service";

class ZynkController {
  async createEntity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await zynkService.createEntity(req.user.id);
      res
        .status(201)
        .json(new APIResponse(true, "Zynk entity created successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async startKyc(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kycData = await zynkService.startKyc(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "KYC started successfully", kycData));
    } catch (error) {
      next(error);
    }
  }

  async getKycStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kycStatus = await zynkService.getKycStatus(req.user.id);
      res
        .status(200)
        .json(
          new APIResponse(true, "KYC status retrieved successfully", kycStatus)
        );
    } catch (error) {
      next(error);
    }
  }

  async createFundingAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await zynkService.createFundingAccount(req.user.id);
      res
        .status(201)
        .json(
          new APIResponse(true, "Funding account created successfully", result)
        );
    } catch (error) {
      next(error);
    }
  }

  async getFundingAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const fundingAccount = await zynkService.getFundingAccount(req.user.id);
      res
        .status(200)
        .json(
          new APIResponse(
            true,
            "Funding account retrieved successfully",
            fundingAccount
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async activateFundingAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const fundingAccount = await zynkService.activateFundingAccount(
        req.user.id
      );
      res
        .status(200)
        .json(
          new APIResponse(
            true,
            "Funding account activated successfully",
            fundingAccount
          )
        );
    } catch (error) {
      next(error);
    }
  }

  async deactivateFundingAccount(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const fundingAccount = await zynkService.deactivateFundingAccount(
        req.user.id
      );
      res
        .status(200)
        .json(
          new APIResponse(
            true,
            "Funding account deactivated successfully",
            fundingAccount
          )
        );
    } catch (error) {
      next(error);
    }
  }
}

export default new ZynkController();
