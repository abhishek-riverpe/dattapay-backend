import type { RequestHandler } from "express";
import express from "express";
import walletController from "../controllers/wallet.controller";

const router = express.Router();

// [POST] /api/wallet/prepare Request:{}, Response:{payloadId, payloadToSign}
router.post("/prepare", walletController.prepareWallet as RequestHandler);

// [POST] /api/wallet/submit Request:{payloadId, signature}, Response:{message}
router.post("/submit", walletController.submitWallet as RequestHandler);

// [POST] /api/wallet/accounts/prepare Request: {}, Response:{payloadId, payloadToSign}
router.post("/accounts/prepare", walletController.prepareAccount as RequestHandler);

// [POST] /api/wallet/accounts/submit Request:{payloadId, signature}, Response:{message}
router.post("/accounts/submit", walletController.submitAccount as RequestHandler);

// [GET]  /api/wallet Response: {walletId, walletAddress, chain, walletName, status, balances}
router.get("/", walletController.getWallet as RequestHandler);

// [GET]  /api/wallet/transactions Request:{limit, offset}, Response:{transactions}
router.get("/transactions", walletController.getTransactions as RequestHandler);

export default router;
