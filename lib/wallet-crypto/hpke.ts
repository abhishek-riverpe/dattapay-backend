import elliptic from "elliptic";
import bs58check from "bs58check";
const EC = elliptic.ec;

/**
 * Result of decrypting a credential bundle
 */
export interface DecryptedCredentials {
  sessionPublicKey: string; // 66-char hex compressed public key
  sessionPrivateKey: string; // 64-char hex private key
}

/**
 * Convert hex string to Uint8Array
 */
function uint8ArrayFromHexString(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) throw new Error("Invalid hex string");
  return new Uint8Array(matches.map((byte) => Number.parseInt(byte, 16)));
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHexString(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decrypt a credential bundle using manual HPKE implementation.
 * Matches key-generator-main/decrypt_bundle.js implementation exactly.
 *
 * @param bundleStr - Credential bundle (bs58check encoded)
 * @param ephemeralPrivateKey - 64-char hex private key
 * @returns Decrypted session keys
 */
export async function decryptCredentialBundle(
  bundleStr: string,
  ephemeralPrivateKey: string
): Promise<DecryptedCredentials> {
  // Dynamic import of hpke-js (matches key-generator-main)
  const { CipherSuite, KemId, KdfId, AeadId } = await import("hpke-js");

  // Decode the bundle
  const bundleBytes = bs58check.decode(bundleStr);

  if (bundleBytes.length < 33) {
    throw new Error("Bundle too small");
  }

  // Extract compressed encapped key and ciphertext
  const compressedEncappedKeyBuf = bundleBytes.slice(0, 33);
  const ciphertextBuf = bundleBytes.slice(33);

  // Decompress the encapped key
  const ec = new EC("p256");
  const point = ec.curve.decodePoint(Buffer.from(compressedEncappedKeyBuf));
  const encappedKeyHex = point.encode("hex", false);
  const enc = uint8ArrayFromHexString(encappedKeyHex);


  // Create HPKE cipher suite
  const suite = new CipherSuite({
    kem: KemId.DhkemP256HkdfSha256,
    kdf: KdfId.HkdfSha256,
    aead: AeadId.Aes256Gcm,
  });

  // Get receiver's key pair
  const recipientKeyPair = ec.keyFromPrivate(ephemeralPrivateKey, "hex");
  const receiverPublicKeyHex = recipientKeyPair.getPublic(false, "hex");
  const receiverPublicKey = uint8ArrayFromHexString(receiverPublicKeyHex);


  // Import the recipient's private key
  const skR = uint8ArrayFromHexString(ephemeralPrivateKey);
  const recipientKey = await suite.kem.importKey("raw", skR, false);

  // Build AAD (Additional Authenticated Data)
  const aad = new Uint8Array(enc.length + receiverPublicKey.length);
  aad.set(enc, 0);
  aad.set(receiverPublicKey, enc.length);


  // Create info for HPKE
  const info = new TextEncoder().encode("turnkey_hpke");

  // Create recipient context and decrypt
  const recipientCtx = await suite.createRecipientContext({
    recipientKey,
    enc: enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) as ArrayBuffer,
    info: info.buffer.slice(info.byteOffset, info.byteOffset + info.byteLength) as ArrayBuffer,
  });

  const plaintext = await recipientCtx.open(
    ciphertextBuf.buffer.slice(ciphertextBuf.byteOffset, ciphertextBuf.byteOffset + ciphertextBuf.byteLength) as ArrayBuffer,
    aad.buffer.slice(aad.byteOffset, aad.byteOffset + aad.byteLength)
  );

  // Convert plaintext to private key hex
  const ptBytes = plaintext instanceof ArrayBuffer ? new Uint8Array(plaintext) : plaintext;
  const privateKeyHex = uint8ArrayToHexString(ptBytes);


  // Derive keys using elliptic (matches key-generator-main)
  const keyPair = ec.keyFromPrivate(privateKeyHex, "hex");
  const sessionPublicKey = keyPair.getPublic(true, "hex");
  const sessionPrivateKey = keyPair.getPrivate("hex").padStart(64, "0");


  return {
    sessionPublicKey,
    sessionPrivateKey,
  };
}
