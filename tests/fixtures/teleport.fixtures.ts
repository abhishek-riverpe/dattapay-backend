import type { Teleport, ExternalAccount } from "../../generated/prisma/client";
import {
  baseAddress,
  baseUserData,
  USER_ID,
} from "./common.fixtures";

// Domain-specific ID constants
const EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440000";
const SECONDARY_EXTERNAL_ACCOUNT_ID = "770e8400-e29b-41d4-a716-446655440001";
const TELEPORT_ID = "880e8400-e29b-41d4-a716-446655440000";

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

export { ADMIN_TOKEN, AUTH_TOKEN } from "./common.fixtures";
