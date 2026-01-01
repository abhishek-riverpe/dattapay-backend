import express from "express";
import walletRoutes from "../../routes/wallet.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createWalletTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for wallet
  app.use("/api/wallet", auth);
  app.use("/api/wallet", walletRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
