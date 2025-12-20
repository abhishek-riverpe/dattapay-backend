import express from "express";
import zynkController from "../controllers/zynk.controller";

const router = express.Router();

router.post("/entities/:userId", zynkController.createEntity);
router.post("/kyc/:userId", zynkController.startKyc);
router.get("/kyc/status/:userId", zynkController.getKycStatus);
router.post("/funding-account/:userId", zynkController.createFundingAccount);
router.get("/funding-account/:userId", zynkController.getFundingAccount);
router.post("/funding-account/:userId/activate", zynkController.activateFundingAccount);
router.post("/funding-account/:userId/deactivate", zynkController.deactivateFundingAccount);

export default router;
