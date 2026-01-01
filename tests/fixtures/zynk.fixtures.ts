import {
  baseAddress,
  baseUserData as commonBaseUserData,
  ZYNK_ENTITY_ID,
  FUNDING_ACCOUNT_ID,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./common.fixtures";

// Zynk-specific base user data (INITIAL status, no zynk data yet)
const baseUserData = {
  ...commonBaseUserData,
  accountStatus: "INITIAL" as const,
  zynkEntityId: null,
  zynkFundingAccountId: null,
};

// User for auth middleware (basic user without zynk data)
export const mockUser = {
  ...baseUserData,
  address: baseAddress,
};

// User without address (for createEntity validation)
export const mockUserWithoutAddress = {
  ...baseUserData,
  address: null,
};

// User without public key (for createEntity validation)
export const mockUserWithoutPublicKey = {
  ...baseUserData,
  publicKey: null,
  address: baseAddress,
};

// User with Zynk entity (for KYC and funding account operations)
export const mockUserWithZynkEntity = {
  ...baseUserData,
  zynkEntityId: ZYNK_ENTITY_ID,
  accountStatus: "PENDING",
  address: baseAddress,
};

// User with both Zynk entity and funding account
export const mockUserWithFundingAccount = {
  ...baseUserData,
  zynkEntityId: ZYNK_ENTITY_ID,
  zynkFundingAccountId: FUNDING_ACCOUNT_ID,
  accountStatus: "ACTIVE",
  address: baseAddress,
};

// Mock response data for createEntity
export const mockCreatedEntityResponse = {
  ...mockUserWithZynkEntity,
};

// Mock KYC data
export const mockKycData = {
  kycId: "kyc_123",
  status: "pending",
  verificationUrl: "https://zynk.com/verify/kyc_123",
};

// Mock KYC status response
export const mockKycStatus = {
  status: "approved",
  verifiedAt: new Date().toISOString(),
  entityId: ZYNK_ENTITY_ID,
};

// Mock funding account data
export const mockFundingAccount = {
  id: FUNDING_ACCOUNT_ID,
  entityId: ZYNK_ENTITY_ID,
  status: "active",
  accountNumber: "****1234",
  routingNumber: "****5678",
  balance: 0,
};

// Mock create funding account response
export const mockCreateFundingAccountResponse = {
  user: mockUserWithFundingAccount,
  fundingAccount: mockFundingAccount,
};

// Mock activated/deactivated funding account
export const mockActivatedFundingAccount = {
  ...mockFundingAccount,
  status: "active",
};

export const mockDeactivatedFundingAccount = {
  ...mockFundingAccount,
  status: "inactive",
};

export { ADMIN_TOKEN, AUTH_TOKEN };
