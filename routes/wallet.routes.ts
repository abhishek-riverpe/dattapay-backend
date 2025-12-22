import type { RequestHandler } from "express";
import express from "express";
import walletController from "../controllers/wallet.controller";

const router = express.Router();

// Session management
router.post(
  "/session/initiate",
  walletController.initiateSession as RequestHandler
);
router.post(
  "/session/verify",
  walletController.verifySession as RequestHandler
);

// Wallet operations
router.post("/", walletController.createWallet as RequestHandler);
router.get("/", walletController.getWallet as RequestHandler);
router.get("/balances", walletController.getBalances as RequestHandler);
router.get("/transactions", walletController.getTransactions as RequestHandler);

export default router;
