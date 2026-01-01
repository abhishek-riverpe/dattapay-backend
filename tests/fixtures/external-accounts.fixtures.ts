import type { User, ExternalAccount, Address } from "../../generated/prisma/client";

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
  accountStatus: "ACTIVE",
  zynkEntityId: "zynk_entity_123",
  zynkFundingAccountId: "funding_account_123",
  created_at: new Date(),
  updated_at: new Date(),
};

// User for auth middleware (with zynk entity)
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

// Mock external account list
export const mockExternalAccountList = [
  { ...baseExternalAccountData },
  {
    ...baseExternalAccountData,
    id: "770e8400-e29b-41d4-a716-446655440001",
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    label: "Secondary Wallet",
    zynkExternalAccountId: "zynk_ext_acc_456",
  },
];

// Valid create external account payload
export const validCreatePayload = {
  walletAddress: "0x9876543210fedcba9876543210fedcba98765432",
  label: "New Wallet",
  type: "ETHEREUM",
  walletId: "new_wallet_123",
};

// Invalid payloads for validation tests
export const invalidCreatePayloadMissingAddress = {
  label: "New Wallet",
};

export const invalidCreatePayloadEmptyAddress = {
  walletAddress: "",
  label: "New Wallet",
};

export const invalidCreatePayloadLongAddress = {
  walletAddress: "a".repeat(256),
  label: "New Wallet",
};

// Mock Zynk response for create
export const mockZynkCreateResponse = {
  data: {
    accountId: "zynk_ext_acc_new_123",
  },
};

// Mock created external account
export const mockCreatedExternalAccount = {
  ...baseExternalAccountData,
  id: "880e8400-e29b-41d4-a716-446655440000",
  walletAddress: validCreatePayload.walletAddress,
  label: validCreatePayload.label,
  zynkExternalAccountId: mockZynkCreateResponse.data.accountId,
  type: validCreatePayload.type,
  walletId: validCreatePayload.walletId,
};

export const ADMIN_TOKEN = "test-admin-token";
export const AUTH_TOKEN = "valid-auth-token";

// Valid UUID for tests
export const VALID_UUID = "770e8400-e29b-41d4-a716-446655440000";
export const NON_EXISTENT_UUID = "990e8400-e29b-41d4-a716-446655440000";
