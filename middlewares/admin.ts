import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import Error from "../lib/Error";

export default function admin(req: Request, res: Response, next: NextFunction) {
  const token = req.header("x-api-token");
  if (!token) throw new Error(403, "Access denied. No token provided.");

  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) throw new Error(500, "Server configuration error");

  try {
    const tokensMatch = timingSafeEqual(
      Buffer.from(token),
      Buffer.from(adminToken)
    );
    if (!tokensMatch) throw new Error(403, "Access denied. Invalid Token.");
  } catch (e) {
    throw new Error(403, "Access denied. Invalid Token.");
  }

  next();
}
