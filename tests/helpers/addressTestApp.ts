import express from "express";
import addressRoutes from "../../routes/address.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createAddressTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for addresses
  app.use("/api/addresses", auth);
  app.use("/api/addresses", addressRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
