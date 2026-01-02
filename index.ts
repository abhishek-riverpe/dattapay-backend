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

// Validate required environment variables at startup
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "ADMIN_TOKEN_SECRET",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "ZYNK_API_KEY",
  "ZYNK_BASE_URL",
  "ZYNK_WEBHOOK_SECRET",
  "ZYNK_ROUTING_ID",
  "ZYNK_JURISDICTION_ID",
] as const;

// Only validate in production - development can run with partial config
if (process.env.NODE_ENV === "production") {
  const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(", ")}`);
    process.exit(1);
  }
} else if (process.env.NODE_ENV !== "test") {
  // Warn in development but don't exit
  const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.warn(`Missing environment variables (required in production): ${missingVars.join(", ")}`);
  }
}

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

// General rate limit for all endpoints
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// Stricter rate limits for financial operations
const financialRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const zynkRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const externalAccountsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Webhook rate limiter - stricter to prevent abuse
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (reasonable for webhooks)
  message: { success: false, message: "Too many webhook requests. Please try again later." },
});

// Request body size limits to prevent DoS attacks
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Apply stricter rate limits to financial endpoints
app.use("/api/transfer", financialRateLimiter);
app.use("/api/zynk", zynkRateLimiter);
app.use("/api/external-accounts", externalAccountsRateLimiter);

// Apply webhook rate limiter before webhook routes
app.use("/api/webhook", webhookRateLimiter);

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

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
