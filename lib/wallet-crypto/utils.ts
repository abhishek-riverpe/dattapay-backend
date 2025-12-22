import crypto from "crypto";

/**
 * P-256 curve order for canonical signature enforcement
 */
export const P256_ORDER = BigInt(
  "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551"
);

/**
 * Convert hex string to bytes
 */
export function bytesFromHex(hexString: string): Buffer {
  return Buffer.from(hexString, "hex");
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(data: Buffer | Uint8Array): string {
  return Buffer.from(data).toString("hex");
}

/**
 * Check if a string is valid hexadecimal
 */
export function isHexString(s: string): boolean {
  if (s.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(s);
}

/**
 * SHA-256 hash of a UTF-8 string, returned as hex
 */
export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf-8").digest("hex");
}

/**
 * Convert a UTF-8 string to Base64URL encoding (no padding)
 */
export function toBase64Url(s: string): string {
  const b64 = Buffer.from(s, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert Base64URL to regular string
 */
export function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Decode a credential bundle from either hex or base58check format
 */
export function decodeBundle(bundleStr: string): Buffer {
  if (isHexString(bundleStr)) {
    return Buffer.from(bundleStr, "hex");
  }
  // For base58check, we need to use a library
  // Import dynamically to avoid issues if not installed
  const bs58check = require("bs58check");
  return bs58check.decode(bundleStr);
}

/**
 * Encode bytes to base58check format
 */
export function encodeBase58Check(data: Buffer): string {
  const bs58check = require("bs58check");
  return bs58check.encode(data);
}
