import type {
  Request,
  Response as ExpressResponse,
  ErrorRequestHandler,
  NextFunction,
} from "express";
import AppError from "../lib/AppError";
import APIResponse from "../lib/APIResponse";
import logger from "../lib/logger";

const error = (
  err: ErrorRequestHandler,
  req: Request,
  res: ExpressResponse,
  next: NextFunction
) => {
  if (err instanceof AppError)
    return res.status(err.status).send(new APIResponse(false, err.message));
  }

  // Log unexpected errors at error level with stack trace
  logger.error("Unexpected error", {
    error: err instanceof Error ? err.message : "Unknown error",
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });
  return res.status(500).send(new APIResponse(false, "Internal server error"));
};

export default error;
