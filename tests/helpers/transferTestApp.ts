import express from "express";
import transferRoutes from "../../routes/transfer.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createTransferTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for transfer
  app.use("/api/transfer", auth);
  app.use("/api/transfer", transferRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
