import type { ExternalAccount } from "../../generated/prisma/client";
import {
  baseAddress,
  baseUserData,
  USER_ID,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./common.fixtures";

// Domain-specific ID constants
const EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440000";

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

export { ADMIN_TOKEN, AUTH_TOKEN };

// Valid UUID for tests (reuse EXTERNAL_ACCOUNT_ID for consistency)
export const VALID_UUID = EXTERNAL_ACCOUNT_ID;
export const NON_EXISTENT_UUID = "990e8400-e29b-41d4-a716-446655440000";
