import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import logger from "./lib/logger";
import admin from "./middlewares/admin";

import error from "./middlewares/error";
import router from "./routes";
import webhooks from "./routes/webhook.routes";

dotenv.config();

const app = express();


app.use(helmet());

const allowedOrigins: (string | RegExp)[] = [
  'https://app.dattapay.com',
  // Expo Go development origins
  /^exp:\/\/.*$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'x-api-token'],
}));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", webhooks);
app.use("/api", admin, router);
app.use(error);

const port = process.env.PORT || 7000;

app.listen(port, () =>
  logger.info(`Server running on http://localhost:${port}`)
);
