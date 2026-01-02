import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import logger from "./lib/logger";
import prismaClient from "./lib/prisma-client";
import admin from "./middlewares/admin";

import error from "./middlewares/error";
import router from "./routes";
import webhooks from "./routes/webhook.routes";

dotenv.config();

const app = express();

app.use(
  helmet({
    // Prevent XSS attacks
    xssFilter: true,

    // Prevent clickjacking
    frameguard: { action: "deny" },

    // Enforce HTTPS (enable only if you use HTTPS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Disable DNS prefetching
    dnsPrefetchControl: { allow: false },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // Prevent MIME-type sniffing
    noSniff: true,

    // Referrer policy
    referrerPolicy: { policy: "no-referrer" },
  })
);

const allowedOrigins: (string | RegExp)[] = [
  "https://app.dattapay.com",
  // Expo Go development origins
  /^exp:\/\/.*$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-auth-token", "x-api-token"],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 100 : 1000,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", webhooks);
app.use("/api", admin, router);
app.use(error);

const port = process.env.PORT || 7000;

const server = app.listen(port, () =>
  logger.info(`Server running on http://localhost:${port}`)
);

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info("HTTP server closed.");

    try {
      await prismaClient.$disconnect();
      logger.info("Database connections closed.");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
