import type { User, Teleport, ExternalAccount, Address } from "../../generated/prisma/client";

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

// Base user data with all required Zynk fields
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
  accountStatus: "ACTIVE",
  zynkEntityId: "zynk_entity_123",
  zynkFundingAccountId: "funding_account_123",
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
  id: "770e8400-e29b-41d4-a716-446655440000",
  userId: "550e8400-e29b-41d4-a716-446655440000",
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
  id: "880e8400-e29b-41d4-a716-446655440000",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  externalAccountId: "770e8400-e29b-41d4-a716-446655440000",
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
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
  zynkTeleportId: mockZynkTeleportResponse.data.teleportId,
  externalAccount: {
    ...mockExternalAccount,
    id: "770e8400-e29b-41d4-a716-446655440001",
  },
};

// Valid create teleport payload
export const validCreatePayload = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440000",
};

// Valid update teleport payload
export const validUpdatePayload = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
};

// Invalid payloads for validation tests
export const invalidPayloadMissingId = {};

export const invalidPayloadInvalidUuid = {
  externalAccountId: "invalid-uuid",
};

export const invalidPayloadEmptyId = {
  externalAccountId: "",
};

export const ADMIN_TOKEN = "test-admin-token";
export const AUTH_TOKEN = "valid-auth-token";

// Valid UUIDs for tests
export const VALID_EXTERNAL_ACCOUNT_UUID = "770e8400-e29b-41d4-a716-446655440000";
export const NON_EXISTENT_EXTERNAL_ACCOUNT_UUID = "990e8400-e29b-41d4-a716-446655440000";
