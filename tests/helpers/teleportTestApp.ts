import express from "express";
import teleportRoutes from "../../routes/teleport.routes";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export function createTeleportTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  // Apply auth middleware for teleport
  app.use("/api/teleport", auth);
  app.use("/api/teleport", teleportRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
