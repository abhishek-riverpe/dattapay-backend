import exporess, { type Request, type Response } from "express";
import prismaClient from "../services/prisma-client";
import APIResponse from "../lib/APIResponse";

const router = exporess.Router();

router.get("/", async (req: Request, res: Response) => {
  const users = await prismaClient.user.findMany();
  res.status(200).send(new APIResponse(true, "Success", users));
});

export default router;
