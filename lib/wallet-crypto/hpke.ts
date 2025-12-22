import {
  CipherSuite,
  DhkemP256HkdfSha256,
  HkdfSha256,
  Aes256Gcm,
} from "@hpke/core";
import { bytesFromHex, bytesToHex, decodeBundle } from "./utils";
import {
  derivePublicKeyFromPrivate,
  uncompressPublicKey,
} from "./keypair";
import type { KeyPair } from "./keypair";

/**
 * Result of decrypting a credential bundle
 */
export interface DecryptedCredentials {
  sessionPublicKey: string; // 66-char hex compressed public key
  sessionPrivateKey: string; // 64-char hex private key
}

/**
 * Create HPKE cipher suite for P-256 with HKDF-SHA256 and AES-256-GCM
 */
function createCipherSuite() {
  return new CipherSuite({
    kem: new DhkemP256HkdfSha256(),
    kdf: new HkdfSha256(),
    aead: new Aes256Gcm(),
  });
}

/**
 * Parse the encapped key and ciphertext from bundle bytes
 * Handles both compressed (33 bytes) and uncompressed (65 bytes) encapped keys
 */
function parseBundleEncappedKey(bundleBytes: Buffer): {
  enc: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (bundleBytes.length === 0) {
    throw new Error("Bundle is empty");
  }

  const firstByte = bundleBytes[0];

  let enc: Buffer;
  let ciphertext: Buffer;

  if (firstByte === 0x04) {
    // Uncompressed public key (65 bytes)
    if (bundleBytes.length < 65) {
      throw new Error(
        `Bundle too small for uncompressed key: ${bundleBytes.length} bytes`
      );
    }
    enc = bundleBytes.subarray(0, 65);
    ciphertext = bundleBytes.subarray(65);
  } else if (firstByte === 0x02 || firstByte === 0x03) {
    // Compressed public key (33 bytes)
    if (bundleBytes.length < 33) {
      throw new Error(
        `Bundle too small for compressed key: ${bundleBytes.length} bytes`
      );
    }
    const compressedEncappedKey = bundleBytes.subarray(0, 33);
    ciphertext = bundleBytes.subarray(33);
    // Uncompress the encapped key for HPKE
    enc = uncompressPublicKey(compressedEncappedKey);
  } else {
    throw new Error(
      `Invalid encapped key prefix: 0x${firstByte?.toString(16) ?? "unknown"}`
    );
  }

  return {
    enc: new Uint8Array(enc),
    ciphertext: new Uint8Array(ciphertext),
  };
}

/**
 * Decrypt a credential bundle using HPKE
 * @param bundleStr - Credential bundle (hex or bs58check encoded)
 * @param ephemeralPrivateKey - 64-char hex private key
 * @returns Decrypted session keys
 */
export async function decryptCredentialBundle(
  bundleStr: string,
  ephemeralPrivateKey: string
): Promise<DecryptedCredentials> {
  // Decode the bundle
  const bundleBytes = decodeBundle(bundleStr);

  // Parse encapped key and ciphertext
  const { enc, ciphertext } = parseBundleEncappedKey(bundleBytes);

  // Validate ciphertext size (must include GCM tag)
  if (ciphertext.length < 16) {
    throw new Error(`Ciphertext too small: ${ciphertext.length} bytes`);
  }

  // Create cipher suite
  const suite = createCipherSuite();

  // Get receiver's public key (uncompressed)
  const { uncompressed: receiverPublicKey } =
    derivePublicKeyFromPrivate(ephemeralPrivateKey);

  // Import the private key
  const privateKeyBytes = bytesFromHex(ephemeralPrivateKey);

  // Create the recipient key from raw private key bytes
  const recipientKeyPair = await suite.kem.importKey(
    "raw",
    new Uint8Array(privateKeyBytes),
    false // isPublic = false
  );

  // Build AAD: enc || receiver_public_key (uncompressed)
  const aad = new Uint8Array(enc.length + receiverPublicKey.length);
  aad.set(enc, 0);
  aad.set(new Uint8Array(receiverPublicKey), enc.length);

  // Info string used by Turnkey/Zynk
  const info = new TextEncoder().encode("turnkey_hpke");

  // Create recipient context and decrypt
  // Cast to any to avoid strict type checking issues with @hpke/core
  const recipientCtx = await suite.createRecipientContext({
    recipientKey: recipientKeyPair,
    enc: enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) as ArrayBuffer,
    info: info.buffer.slice(info.byteOffset, info.byteOffset + info.byteLength) as ArrayBuffer,
  });

  // Decrypt the ciphertext
  const plaintext = await recipientCtx.open(
    ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as ArrayBuffer,
    aad.buffer.slice(aad.byteOffset, aad.byteOffset + aad.byteLength) as ArrayBuffer
  );

  // Convert plaintext to hex (this is the session private key)
  const sessionPrivateKey = bytesToHex(Buffer.from(plaintext)).padStart(
    64,
    "0"
  );

  // Derive the session public key (compressed)
  const { compressed } = derivePublicKeyFromPrivate(sessionPrivateKey);
  const sessionPublicKey = bytesToHex(compressed);

  return {
    sessionPublicKey,
    sessionPrivateKey,
  };
}
