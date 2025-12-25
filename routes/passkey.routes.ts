import express from "express";
import APIResponse from "../lib/APIResponse";
import { signPayloadWithApiKey } from "../lib/crypto";
import Error from "../lib/Error";
import {
  preparePasskeyRegistration,
  submitPasskeyRegistration,
} from "../lib/zynk-client";
import type { AuthRequest } from "../middlewares/auth";

const router = express.Router();

interface PasskeyData {
  authenticatorName: string;
  challenge: string;
  attestation: {
    credentialId: string;
    clientDataJson: string;
    attestationObject: string;
    transports: string[];
  };
}

type RequestBody = {
  publicKey: string;
  privateKey: string;
  passkeyData: PasskeyData;
};

router.post("/", async (req, res, next) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user.zynkEntityId) throw new Error(404, "User not found");

    const body: RequestBody = req.body;
    const prepareRes = await preparePasskeyRegistration(
      user.zynkEntityId,
      body.passkeyData
    );

    const prepareData = prepareRes.data.data || prepareRes.data;

    const signData = await signPayloadWithApiKey(
      prepareData.payloadToSign,
      body.privateKey,
      body.publicKey
    );

    await submitPasskeyRegistration(prepareData.payloadId, signData.signature);

    res.status(200).send(new APIResponse(true, "Success"));
  } catch (error) {
    next(error);
  }
});

export default router;
