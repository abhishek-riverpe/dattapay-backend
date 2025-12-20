import express from "express";
import zynkController from "../controllers/zynk.controller";

const router = express.Router();

router.post("/entities/:userId", zynkController.createEntity);
router.post("/kyc/:userId", zynkController.startKyc);
router.get("/kyc/status/:userId", zynkController.getKycStatus);

export default router;
