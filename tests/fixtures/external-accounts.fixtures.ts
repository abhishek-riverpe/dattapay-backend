import type { User, ExternalAccount, Address } from "../../generated/prisma/client";
import { VALID_ADMIN_TOKEN } from "../helpers/jwt";

// Common ID constants
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADDRESS_ID = "660e8400-e29b-41d4-a716-446655440001";
const EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440000";
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

// Base user data
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

// Common test constants
const DEFAULT_LABEL = "New Wallet";

// Valid create external account payload
export const validCreatePayload = {
  walletAddress: "0x9876543210fedcba9876543210fedcba98765432",
  label: DEFAULT_LABEL,
  type: "ETHEREUM",
  walletId: "new_wallet_123",
};

// Invalid payloads for validation tests
export const invalidPayloads = {
  missingAddress: { label: DEFAULT_LABEL },
  emptyAddress: { walletAddress: "", label: DEFAULT_LABEL },
  longAddress: { walletAddress: "a".repeat(256), label: DEFAULT_LABEL },
} as const;

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

export const ADMIN_TOKEN = VALID_ADMIN_TOKEN;
export const AUTH_TOKEN = "valid-auth-token";

// Valid UUID for tests (reuse EXTERNAL_ACCOUNT_ID for consistency)
export const VALID_UUID = EXTERNAL_ACCOUNT_ID;
export const NON_EXISTENT_UUID = "990e8400-e29b-41d4-a716-446655440000";
