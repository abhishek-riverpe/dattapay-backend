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
  // Use structured logger instead of console.error
  if (err instanceof AppError) {
    // Log application errors at warn level (expected errors)
    logger.warn("Application error", {
      status: err.status,
      message: err.message,
      path: req.path,
      method: req.method,
    });
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
