import express, { Router } from "express";
import admin from "../../middlewares/admin";
import auth from "../../middlewares/auth";
import errorMiddleware from "../../middlewares/error";

export interface TestAppConfig {
  basePath: string;
  routes: Router;
  useAdmin?: boolean;
  useAuth?: boolean;
}

/**
 * Creates a test Express app with configurable middleware
 * @param config - Configuration for the test app
 * @returns Express application configured for testing
 */
export function createTestApp(config: TestAppConfig) {
  const { basePath, routes, useAdmin = true, useAuth = true } = config;

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply admin middleware if enabled
  if (useAdmin) {
    app.use("/api", admin);
  }

  // Apply auth middleware if enabled
  if (useAuth) {
    app.use(basePath, auth);
  }

  // Apply routes
  app.use(basePath, routes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
