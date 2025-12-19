import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import logger from "./lib/logger";
import auth from "./middlewares/auth";
import admin from "./middlewares/admin";

import router from "./routes";
import error from "./middlewares/error";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", [admin, auth], router);
app.use(error);

const port = process.env.PORT || 7000;

app.listen(port, () =>
  logger.info(`Server running on http://localhost:${port}`)
);
