import type {
  Request,
  Response as ExpressResponse,
  ErrorRequestHandler,
  NextFunction,
} from "express";
import Error from "../lib/Error";
import APIResponse from "../lib/APIResponse";

const error = (
  err: ErrorRequestHandler,
  req: Request,
  res: ExpressResponse,
  next: NextFunction
) => {
  if (err instanceof Error)
    return res.status(err.status).send(new APIResponse(false, err.message));
  return res.status(500).send(new APIResponse(false, "Internal server error"));
};

export default error;
