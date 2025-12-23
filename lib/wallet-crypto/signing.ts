import { P256_ORDER } from "./utils";
import crypto from "node:crypto";
import elliptic from "elliptic";
const EC = elliptic.ec;

/**
 * Signature stamp object that gets encoded to base64url
 */
interface SignatureStamp {
  publicKey: string;
  scheme: string;
  signature: string;
}

/**
 * Ensure signature is in canonical (low-S) form
 * If s > n/2, replace with n - s
 */
export function makeCanonicalSignature(
  r: bigint,
  s: bigint
): { r: bigint; s: bigint } {
  const halfOrder = P256_ORDER / 2n;
  if (s > halfOrder) {
    s = P256_ORDER - s;
  }
  return { r, s };
}

/**
 * Signs a payload using API key pair (P-256).
 * Matches key-generator-main/sign_passkey.js implementation exactly.
 */
export function signPayload(
  payload: string,
  apiPrivateKey: string,
  apiPublicKey?: string
): string {
  // Debug: Log inputs

  // Hash the payload with SHA256
  const hashHex = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");


  const ec = new EC("p256");
  const key = ec.keyFromPrivate(apiPrivateKey, "hex");

  // Derive compressed public key directly from the key (matches key-generator-main)
  const derivedPublicKey = key.getPublic(true, "hex");


  // If a public key was provided, validate it matches
  if (apiPublicKey) {
    if (derivedPublicKey !== apiPublicKey) {
      console.error("Public key mismatch:", {
        provided: apiPublicKey,
        derived: derivedPublicKey,
      });
      throw new Error("Public key does not match private key!");
    }
  }

  // Sign the hash with canonical mode
  const signature = key.sign(hashHex, { canonical: true });

  // Convert to DER format
  const derHex = signature.toDER("hex");


  // Create stamp object
  const stampObj = {
    publicKey: derivedPublicKey,
    scheme: "SIGNATURE_SCHEME_TK_API_P256",
    signature: derHex,
  };


  // Convert to base64url
  const jsonString = JSON.stringify(stampObj);
  const base64 = Buffer.from(jsonString).toString("base64");
  const base64Url = base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");    


  return base64Url;
}

/**
 * Sign payload and return detailed information
 * Matches key-generator-main/sign_passkey.js implementation exactly.
 */
export function signPayloadWithDetails(
  payload: string,
  apiPrivateKey: string,
  apiPublicKey?: string
): {
  signature: string;
  details: {
    publicKey: string;
    scheme: string;
    signatureHex: string;
    payloadHash: string;
  };
} {
  // Hash the payload with SHA256
  const hashHex = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");

  const ec = new EC("p256");
  const key = ec.keyFromPrivate(apiPrivateKey, "hex");

  // Derive compressed public key directly from the key (matches key-generator-main)
  const derivedPublicKey = key.getPublic(true, "hex");

  // If a public key was provided, validate it matches
  if (apiPublicKey) {
    if (derivedPublicKey !== apiPublicKey) {
      console.error("Public key mismatch:", {
        provided: apiPublicKey,
        derived: derivedPublicKey,
      });
      throw new Error("Public key does not match private key!");
    }
  }

  // Sign the hash with canonical mode
  const signature = key.sign(hashHex, { canonical: true });

  // Convert to DER format
  const derHex = signature.toDER("hex");

  // Create stamp object
  const stamp: SignatureStamp = {
    publicKey: derivedPublicKey,
    scheme: "SIGNATURE_SCHEME_TK_API_P256",
    signature: derHex,
  };

  // Convert to base64url
  const jsonString = JSON.stringify(stamp);
  const base64 = Buffer.from(jsonString).toString("base64");
  const signatureB64Url = base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return {
    signature: signatureB64Url,
    details: {
      publicKey: derivedPublicKey,
      scheme: "SIGNATURE_SCHEME_TK_API_P256",
      signatureHex: derHex,
      payloadHash: hashHex,
    },
  };
}
