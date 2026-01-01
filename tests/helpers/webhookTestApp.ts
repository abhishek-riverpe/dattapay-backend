import express from "express";
import webhookRoutes from "../../routes/webhook.routes";
import errorMiddleware from "../../middlewares/error";

export function createWebhookTestApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Webhook routes don't use admin or auth middleware
  app.use("/api", webhookRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
