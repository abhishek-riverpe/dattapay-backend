import type { Request, Response } from "express";
import express from "express";
import APIResponse from "../lib/APIResponse";
import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import zynkRepository from "../repositories/zynk.repository";

const router = express.Router();

type KYCEvent = {
  eventCategory: "kyc" | "transfer";
  eventType: "transitioned";
  eventStatus: "approved";
  eventObject: {
    entityId: string;
    routingId: string;
    status: "approved";
    routingEnabled: boolean;
  };
};

router.post("/webhook", async (req: Request, res: Response) => {
  const body: KYCEvent = req.body;
  if (body.eventCategory !== "kyc") return;
  if (body.eventStatus !== "approved" && body.eventObject.status !== "approved")
    return;

  const user = await userRepository.findByZynkEntityId(
    body.eventObject.entityId
  );
  if (!user) throw new Error(404, "User not found");
  await userRepository.update(user.id, { accountStatus: "ACTIVE" });
  await zynkRepository.createFundingAccount(body.eventObject.entityId);
  res.status(200).send(new APIResponse(true, "Success"));
});

export default router;
