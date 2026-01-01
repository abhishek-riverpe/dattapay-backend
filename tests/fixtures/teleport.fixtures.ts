import type { User, Teleport, ExternalAccount, Address } from "../../generated/prisma/client";
import { VALID_ADMIN_TOKEN } from "../helpers/jwt";

// Common ID constants
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADDRESS_ID = "660e8400-e29b-41d4-a716-446655440001";
const EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440000";
const SECONDARY_EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440001";
const TELEPORT_ID = "880e8400-e29b-41d4-a716-446655440000";
const ZYNK_ENTITY_ID = "zynk_entity_123";
const FUNDING_ACCOUNT_ID = "funding_account_123";

// Base address for user relations
const baseAddress: Address = {
  id: ADDRESS_ID,
  addressLine1: "123 Main St",
  addressLine2: null,
  locality: "Downtown",
  city: "New York",
  state: "NY",
  country: "USA",
  postalCode: "10001",
  userId: USER_ID,
  created_at: new Date(),
  updated_at: new Date(),
};

// Base user data with all required Zynk fields
const baseUserData: User = {
  id: USER_ID,
  clerkUserId: "clerk_user_123",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  publicKey: "pub_key_123",
  phoneNumberPrefix: "+1",
  phoneNumber: "5551234567",
  nationality: "US",
  dateOfBirth: new Date("1990-01-15"),
  accountStatus: "ACTIVE",
  zynkEntityId: ZYNK_ENTITY_ID,
  zynkFundingAccountId: FUNDING_ACCOUNT_ID,
  created_at: new Date(),
  updated_at: new Date(),
};

// User for auth middleware (with all required fields)
export const mockUser = {
  ...baseUserData,
  address: baseAddress,
};

// User without zynk entity
export const mockUserWithoutZynkEntity = {
  ...baseUserData,
  zynkEntityId: null,
  zynkFundingAccountId: null,
  address: baseAddress,
};

// User without funding account
export const mockUserWithoutFundingAccount = {
  ...baseUserData,
  zynkFundingAccountId: null,
  address: baseAddress,
};

// Base external account data
const baseExternalAccountData: ExternalAccount = {
  id: EXTERNAL_ACCOUNT_ID,
  userId: USER_ID,
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  label: "My Wallet",
  zynkExternalAccountId: "zynk_ext_acc_123",
  type: "ETHEREUM",
  walletId: "wallet_123",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

// Mock external account
export const mockExternalAccount = {
  ...baseExternalAccountData,
};

// External account without Zynk registration
export const mockExternalAccountWithoutZynk = {
  ...baseExternalAccountData,
  zynkExternalAccountId: null,
};

// Base teleport data
const baseTeleportData: Teleport = {
  id: TELEPORT_ID,
  userId: USER_ID,
  externalAccountId: EXTERNAL_ACCOUNT_ID,
  zynkTeleportId: "zynk_teleport_123",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
};

// Mock teleport with external account
export const mockTeleport = {
  ...baseTeleportData,
  externalAccount: mockExternalAccount,
};

// Mock Zynk response for create/update
export const mockZynkTeleportResponse = {
  data: {
    teleportId: "zynk_teleport_new_123",
  },
};

// Mock created teleport
export const mockCreatedTeleport = {
  ...baseTeleportData,
  zynkTeleportId: mockZynkTeleportResponse.data.teleportId,
  externalAccount: mockExternalAccount,
};

// Mock updated teleport with new external account
export const mockUpdatedTeleport = {
  ...baseTeleportData,
  externalAccountId: SECONDARY_EXTERNAL_ACCOUNT_ID,
  zynkTeleportId: mockZynkTeleportResponse.data.teleportId,
  externalAccount: {
    ...mockExternalAccount,
    id: SECONDARY_EXTERNAL_ACCOUNT_ID,
  },
};

// UUID constants (reuse internal constants for consistency)
export const VALID_EXTERNAL_ACCOUNT_UUID = EXTERNAL_ACCOUNT_ID;
export const SECONDARY_EXTERNAL_ACCOUNT_UUID = SECONDARY_EXTERNAL_ACCOUNT_ID;
export const NON_EXISTENT_EXTERNAL_ACCOUNT_UUID = "990e8400-e29b-41d4-a716-446655440000";

// Valid payloads
export const validCreatePayload = {
  externalAccountId: VALID_EXTERNAL_ACCOUNT_UUID,
};

export const validUpdatePayload = {
  externalAccountId: SECONDARY_EXTERNAL_ACCOUNT_UUID,
};

// Invalid payloads for validation tests
export const invalidPayloads = {
  missingId: {},
  invalidUuid: { externalAccountId: "invalid-uuid" },
  emptyId: { externalAccountId: "" },
} as const;

export const ADMIN_TOKEN = VALID_ADMIN_TOKEN;
export const AUTH_TOKEN = "valid-auth-token";
