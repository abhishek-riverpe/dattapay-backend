import { p256 } from "@noble/curves/p256";
import { bytesFromHex, bytesToHex, sha256Hex, toBase64Url, P256_ORDER } from "./utils";
import { getCompressedPublicKey } from "./keypair";

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
 * Encode r and s values to DER format
 */
function encodeDER(r: bigint, s: bigint): Buffer {
  // Convert to bytes, ensuring proper padding
  const rBytes = bigintToBytes(r);
  const sBytes = bigintToBytes(s);

  // Add leading zero if high bit is set (to ensure positive integer)
  const rFirstByte = rBytes[0] ?? 0;
  const sFirstByte = sBytes[0] ?? 0;
  const rPadded = rFirstByte & 0x80 ? Buffer.concat([Buffer.from([0]), rBytes]) : rBytes;
  const sPadded = sFirstByte & 0x80 ? Buffer.concat([Buffer.from([0]), sBytes]) : sBytes;

  // DER encoding: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  const totalLength = 2 + rPadded.length + 2 + sPadded.length;

  return Buffer.concat([
    Buffer.from([0x30, totalLength]),
    Buffer.from([0x02, rPadded.length]),
    rPadded,
    Buffer.from([0x02, sPadded.length]),
    sPadded,
  ]);
}

/**
 * Convert bigint to Buffer (big-endian, minimal bytes)
 */
function bigintToBytes(n: bigint): Buffer {
  if (n === 0n) return Buffer.from([0]);

  const hex = n.toString(16).padStart(64, "0"); // Pad to 32 bytes for P-256
  const bytes = Buffer.from(hex, "hex");

  // Remove leading zeros (but keep at least one byte)
  let start = 0;
  while (start < bytes.length - 1) {
    const byte = bytes[start];
    if (byte !== 0) break;
    start++;
  }
  return bytes.subarray(start);
}

/**
 * Sign a payload with an API private key
 * @param payload - The payload string to sign
 * @param apiPrivateKey - 64-char hex private key
 * @param apiPublicKey - Optional 66-char hex compressed public key (will be derived if not provided)
 * @returns Base64URL encoded signature stamp
 */
export function signPayload(
  payload: string,
  apiPrivateKey: string,
  apiPublicKey?: string
): string {
  // Derive public key if not provided
  if (!apiPublicKey) {
    apiPublicKey = getCompressedPublicKey(apiPrivateKey);
  }

  // Validate public key format
  if (apiPublicKey.length !== 66) {
    throw new Error(
      `Public key must be 66 hex chars (compressed), got ${apiPublicKey.length}`
    );
  }
  if (!apiPublicKey.startsWith("02") && !apiPublicKey.startsWith("03")) {
    throw new Error(
      `Public key must start with 02 or 03 (compressed), got ${apiPublicKey.slice(0, 2)}`
    );
  }

  // Hash the payload
  const hashHex = sha256Hex(payload);
  const hashBytes = bytesFromHex(hashHex);

  // Sign using noble/curves
  const privateKeyBytes = bytesFromHex(apiPrivateKey);
  const signature = p256.sign(hashBytes, privateKeyBytes, {
    lowS: true, // Enforce canonical signature
  });

  // Get r and s values
  let { r, s } = signature;

  // Ensure canonical form (should already be due to lowS: true, but double-check)
  const canonical = makeCanonicalSignature(r, s);
  r = canonical.r;
  s = canonical.s;

  // Encode to DER format
  const derSignature = encodeDER(r, s);
  const derHex = bytesToHex(derSignature);

  // Create signature stamp
  const stamp: SignatureStamp = {
    publicKey: apiPublicKey,
    scheme: "SIGNATURE_SCHEME_TK_API_P256",
    signature: derHex,
  };

  // Convert to JSON and base64url encode
  const stampJson = JSON.stringify(stamp);
  return toBase64Url(stampJson);
}

/**
 * Sign payload and return detailed information
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
  if (!apiPublicKey) {
    apiPublicKey = getCompressedPublicKey(apiPrivateKey);
  }

  const hashHex = sha256Hex(payload);
  const hashBytes = bytesFromHex(hashHex);

  const privateKeyBytes = bytesFromHex(apiPrivateKey);
  const sig = p256.sign(hashBytes, privateKeyBytes, { lowS: true });

  const { r, s } = makeCanonicalSignature(sig.r, sig.s);
  const derSignature = encodeDER(r, s);
  const derHex = bytesToHex(derSignature);

  const stamp: SignatureStamp = {
    publicKey: apiPublicKey,
    scheme: "SIGNATURE_SCHEME_TK_API_P256",
    signature: derHex,
  };

  const stampJson = JSON.stringify(stamp);
  const signatureB64Url = toBase64Url(stampJson);

  return {
    signature: signatureB64Url,
    details: {
      publicKey: apiPublicKey,
      scheme: "SIGNATURE_SCHEME_TK_API_P256",
      signatureHex: derHex,
      payloadHash: hashHex,
    },
  };
}
