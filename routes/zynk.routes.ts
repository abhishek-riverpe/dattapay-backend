import type { RequestHandler } from "express";
import express from "express";
import zynkController from "../controllers/zynk.controller";

const router = express.Router();

router.post("/entities", zynkController.createEntity as RequestHandler);
router.post("/kyc", zynkController.startKyc as RequestHandler);
router.get("/kyc/status", zynkController.getKycStatus as RequestHandler);
router.post(
  "/funding-account",
  zynkController.createFundingAccount as RequestHandler
);
router.get(
  "/funding-account",
  zynkController.getFundingAccount as RequestHandler
);
router.post(
  "/funding-account/activate",
  zynkController.activateFundingAccount as RequestHandler
);
router.post(
  "/funding-account/deactivate",
  zynkController.deactivateFundingAccount as RequestHandler
);

router.post(
  "register-primary-auth",
  zynkController.registerPrimaryAuth as RequestHandler
);

export default router;
