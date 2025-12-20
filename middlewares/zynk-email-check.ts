import type { Request, Response, NextFunction } from "express";
import zynkRepository from "../repositories/zynk.repository";
import Error from "../lib/Error";

export default async function zynkEmailCheck(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email } = req.body;

  if (!email) {
    return next();
  }

  try {
    const emailExists = await zynkRepository.checkEmailExists(email);

    if (emailExists) {
      throw new Error(409, "Please use a different email address for now.");
    }

    next();
  } catch (error) {
    next(error);
  }
}
