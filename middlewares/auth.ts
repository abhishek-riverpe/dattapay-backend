import { verifyToken } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import userService from "../services/user.service";
import Error from "../lib/Error";
import type { User } from "../generated/prisma/client";

export interface AuthRequest extends Request {
  user: User;
}

export default async function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.header("x-auth-token") as string;
  if (!token) throw new Error(401, "Access denied. No token provided.");

  try {
    const decoded = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY as string,
    });
    const user = await userService.getByClerkUserId(decoded.sub);
    (req as AuthRequest).user = user;

    next();
  } catch (error) {
    if (error instanceof Error) {
      next(new Error(401, error.message));
    } else {
      next(new Error(401, "Invalid or expired token."));
    }
  }
}
