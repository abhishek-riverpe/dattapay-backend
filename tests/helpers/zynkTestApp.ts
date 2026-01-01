import express from "express";
import zynkRoutes from "../../routes/zynk.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createZynkTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for zynk routes
  app.use("/api/zynk", auth);
  app.use("/api/zynk", zynkRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
