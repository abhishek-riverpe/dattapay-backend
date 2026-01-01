import express from "express";
import externalAccountsRoutes from "../../routes/external-accounts.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createExternalAccountsTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for external accounts
  app.use("/api/external-accounts", auth);
  app.use("/api/external-accounts", externalAccountsRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
