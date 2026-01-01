import crypto from "node:crypto";
import type { User, Address } from "../../generated/prisma/client";

// Webhook secret for tests
export const WEBHOOK_SECRET = "test-webhook-secret";

// Base address for user relations
const baseAddress: Address = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  addressLine1: "123 Main St",
  addressLine2: null,
  locality: "Downtown",
  city: "New York",
  state: "NY",
  country: "USA",
  postalCode: "10001",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  created_at: new Date(),
  updated_at: new Date(),
};

// Base user data
const baseUserData: User = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  clerkUserId: "clerk_user_123",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  publicKey: "pub_key_123",
  phoneNumberPrefix: "+1",
  phoneNumber: "5551234567",
  nationality: "US",
  dateOfBirth: new Date("1990-01-15"),
  accountStatus: "PENDING",
  zynkEntityId: "zynk_entity_123",
  zynkFundingAccountId: null,
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock user for webhook processing
export const mockUser = {
  ...baseUserData,
  address: baseAddress,
};

// Mock updated user after webhook
export const mockUpdatedUser = {
  ...baseUserData,
  accountStatus: "ACTIVE",
  zynkFundingAccountId: "funding_account_123",
  address: baseAddress,
};

// Common event constants
const ZYNK_ENTITY_ID = "zynk_entity_123";
const ROUTING_ID = "routing_123";

// Factory function for event objects
const createEventObject = <T extends string>(status: T, routingEnabled: boolean) => ({
  entityId: ZYNK_ENTITY_ID,
  routingId: ROUTING_ID,
  status,
  routingEnabled,
});

// Valid KYC approved event
export const validKycApprovedEvent = {
  eventCategory: "kyc" as const,
  eventType: "transitioned" as const,
  eventStatus: "approved" as const,
  eventObject: createEventObject("approved" as const, true),
};

// Non-KYC event (transfer)
export const transferEvent = {
  eventCategory: "transfer" as const,
  eventType: "transitioned" as const,
  eventStatus: "approved" as const,
  eventObject: createEventObject("approved" as const, true),
};

// Non-approved KYC event
export const nonApprovedKycEvent = {
  eventCategory: "kyc" as const,
  eventType: "transitioned" as const,
  eventStatus: "pending" as const,
  eventObject: createEventObject("pending" as const, false),
};

// Mock funding account response
export const mockFundingAccount = {
  id: "funding_account_123",
  entityId: "zynk_entity_123",
  status: "active",
  accountNumber: "****1234",
  routingNumber: "****5678",
};

/**
 * Generate a valid webhook signature for testing
 */
export function generateWebhookSignature(
  payload: object,
  secret: string = WEBHOOK_SECRET,
  timestamp: string = Date.now().toString()
): string {
  const body = JSON.stringify({ ...payload, signedAt: timestamp });
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return `${timestamp}:${signature}`;
}

/**
 * Generate an invalid webhook signature
 */
export function generateInvalidSignature(): string {
  return `${Date.now()}:invalidbase64signature==`;
}
