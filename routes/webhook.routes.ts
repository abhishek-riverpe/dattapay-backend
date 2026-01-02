import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import APIResponse from "../lib/APIResponse";
import AppError from "../lib/AppError";
import userRepository from "../repositories/user.repository";
import zynkService from "../services/zynk.service";

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

function verifyWebhookSignature(
  payload: object,
  signatureHeader: string,
  secret: string
): boolean {
  const match = /^(\d+):(.+)$/.exec(signatureHeader);
  if (!match?.[1] || !match?.[2]) return false;

  const timestamp = match[1];
  const signature = match[2];
  const body = JSON.stringify({ ...payload, signedAt: timestamp });
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(expectedSignature, "base64")
    );
  } catch {
    return false;
  }
}

router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signatureHeader = req.headers["z-webhook-signature"];
      const secret = process.env.ZYNK_WEBHOOK_SECRET;

      if (!secret) {
        throw new AppError(500, "Webhook secret not configured");
      }

      if (!signatureHeader || typeof signatureHeader !== "string") {
        throw new AppError(401, "Missing webhook signature");
      }

      if (!verifyWebhookSignature(req.body, signatureHeader, secret)) {
        throw new AppError(401, "Invalid webhook signature");
      }

      const body: KYCEvent = req.body;
      if (body.eventCategory !== "kyc") {
        return res.status(200).send(new APIResponse(true, "Event ignored"));
      }
      if (
        body.eventStatus !== "approved" &&
        body.eventObject.status !== "approved"
      ) {
        return res.status(200).send(new APIResponse(true, "Event ignored"));
      }

      const user = await userRepository.findByZynkEntityId(
        body.eventObject.entityId
      );
      if (!user) throw new AppError(404, "User not found");
      await userRepository.update(user.id, { accountStatus: "ACTIVE" });
      await zynkService.createFundingAccount(user.id);
      res.status(200).send(new APIResponse(true, "Success"));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
