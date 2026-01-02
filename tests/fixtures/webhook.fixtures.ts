import crypto from "node:crypto";
import {
  baseAddress,
  baseUserData as commonBaseUserData,
  ZYNK_ENTITY_ID,
} from "./common.fixtures";

// Webhook secret for tests
export const WEBHOOK_SECRET = "test-webhook-secret";

// Webhook-specific base user data (PENDING status, no funding account)
const baseUserData = {
  ...commonBaseUserData,
  accountStatus: "PENDING" as const,
  zynkFundingAccountId: null,
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
