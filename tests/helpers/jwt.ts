import { createHmac } from "crypto";

function base64UrlEncode(buffer: Buffer): string {
  let encoded = buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Remove trailing '=' padding without regex
  while (encoded.endsWith("=")) {
    encoded = encoded.slice(0, -1);
  }
  return encoded;
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestJwt(
  payload: Record<string, unknown>,
  secret: string
): string {
  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64UrlEncode(
    createHmac("sha256", secret).update(signatureInput).digest()
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Test secret used across all tests
export const TEST_ADMIN_SECRET = "test-admin-secret";

// Pre-generated valid admin token for tests
export const VALID_ADMIN_TOKEN = generateTestJwt(
  { admin: true, iat: Math.floor(Date.now() / 1000) },
  TEST_ADMIN_SECRET
);
