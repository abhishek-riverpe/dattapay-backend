import express from "express";
import userRoutes from "../../routes/user.routes";
import admin from "../../middlewares/admin";
import errorMiddleware from "../../middlewares/error";

export function createTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware like in production
  app.use("/api", admin);
  app.use("/api/users", userRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
