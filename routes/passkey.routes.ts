import express from "express";
import APIResponse from "../lib/APIResponse";
import { signPayloadWithApiKey } from "../lib/crypto";
import Error from "../lib/Error";
import zynkClient from "../lib/zynk-client";
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
    const entityId = user.zynkEntityId;
    if (!/^[\w-]+$/.test(entityId)) {
      throw new Error(400, "Invalid entity ID format");
    }
    const prepareRes = await zynkClient.post(
      `/api/v1/wallets/${entityId}/prepare-passkey-registration`,
      body.passkeyData
    );

    const prepareData = prepareRes.data.data || prepareRes.data;

    const signData = await signPayloadWithApiKey(
      prepareData.payloadToSign,
      body.privateKey,
      body.publicKey
    );

    // Submit
    await zynkClient.post("/api/v1/wallets/submit-passkey-registration", {
      payloadId: prepareData.payloadId,
      signature: signData.signature,
    });

    res.status(200).send(new APIResponse(true, "Success"));
  } catch (error) {
    next(error);
  }
});

export default router;
