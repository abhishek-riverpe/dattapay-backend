// Utility functions
export {
  bytesFromHex,
  bytesToHex,
  isHexString,
  sha256Hex,
  toBase64Url,
  fromBase64Url,
  decodeBundle,
  encodeBase58Check,
  P256_ORDER,
} from "./utils";

// Key pair operations
export {
  generateKeypair,
  derivePublicKeyFromPrivate,
  getCompressedPublicKey,
  compressPublicKey,
  uncompressPublicKey,
  type KeyPair,
} from "./keypair";

// Signing operations
export {
  signPayload,
  signPayloadWithDetails,
  makeCanonicalSignature,
} from "./signing";

// HPKE operations
export {
  decryptCredentialBundle,
  type DecryptedCredentials,
} from "./hpke";
