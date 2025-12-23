import elliptic from "elliptic";
const EC = elliptic.ec;
import { bytesFromHex, bytesToHex } from "./utils";

export interface KeyPair {
  privateKey: string; // 64-char hex (32 bytes)
  publicKey: string; // 130-char hex uncompressed (65 bytes) or 66-char compressed (33 bytes)
}

/**
 * Generate a new P-256 ephemeral key pair using elliptic.js
 * Matches key-generator-main/generate_keys.js implementation exactly.
 * @param compressed - If true, return compressed public key (33 bytes), else uncompressed (65 bytes)
 * @returns KeyPair with hex-encoded keys
 */
export function generateKeypair(compressed: boolean = false): KeyPair {
  const ec = new EC("p256");
  const keyPair = ec.genKeyPair();

  // Pad private key to 64 characters (matches key-generator-main)
  const privateKey = keyPair.getPrivate("hex").padStart(64, "0");

  // Get public key in requested format
  const publicKey = keyPair.getPublic(compressed, "hex");


  return {
    privateKey,
    publicKey,
  };
}

/**
 * Derive public key from private key
 * @param privateKeyHex - 64-char hex private key
 * @returns Object with both compressed and uncompressed public keys
 */
export function derivePublicKeyFromPrivate(privateKeyHex: string): {
  compressed: Buffer;
  uncompressed: Buffer;
} {
  const privateKeyBytes = bytesFromHex(privateKeyHex);

    const ec = new EC("p256");
    const key = ec.keyFromPrivate(privateKeyHex, "hex");
    const compressed = bytesFromHex(key.getPublic(true, "hex"));
    const uncompressed = bytesFromHex(key.getPublic(false, "hex"));

  return { compressed, uncompressed };
}

/**
 * Get compressed public key from private key
 * @param privateKeyHex - 64-char hex private key
 * @returns 66-char hex compressed public key
 */
export function getCompressedPublicKey(privateKeyHex: string): string {
  const { compressed } = derivePublicKeyFromPrivate(privateKeyHex);
  return bytesToHex(compressed);
}

/**
 * Compress an uncompressed P-256 public key (65 bytes) to compressed format (33 bytes)
 * Uncompressed format: 0x04 || X (32 bytes) || Y (32 bytes) = 65 bytes
 * Compressed format: [0x02 or 0x03] || X (32 bytes) = 33 bytes
 */
export function compressPublicKey(uncompressedKey: Buffer): Buffer {
  if (uncompressedKey.length !== 65 || uncompressedKey[0] !== 0x04) {
    throw new Error("Invalid uncompressed public key format");
  }

  const x = uncompressedKey.subarray(1, 33);
  const y = uncompressedKey.subarray(33, 65);

  // Check if Y coordinate is even or odd
  const yLastByte = y[31];
  if (yLastByte === undefined) {
    throw new Error("Invalid Y coordinate");
  }
  const prefix = yLastByte % 2 === 0 ? 0x02 : 0x03;

  return Buffer.concat([Buffer.from([prefix]), x]);
}

/**
 * Uncompress a compressed P-256 public key (33 bytes) to uncompressed format (65 bytes)
 * Uses noble/curves to decode and recover the Y coordinate
 */
export function uncompressPublicKey(compressedKey: Buffer): Buffer {
  if (compressedKey.length !== 33) {
    throw new Error(
      `Invalid compressed public key length: ${compressedKey.length}`
    );
  }

  const prefix = compressedKey[0];
  if (prefix !== 0x02 && prefix !== 0x03) {
    throw new Error(
      `Invalid compressed public key prefix: 0x${prefix?.toString(16) ?? "unknown"}`
    );
  }

  // Use noble/curves to decode the point and get uncompressed format
  const ec = new EC("p256");
  const point = ec.curve.decodeFrom(compressedKey);
  const uncompressed = point.toRawBytes(false); // false = uncompressed

  return Buffer.from(uncompressed);
}
