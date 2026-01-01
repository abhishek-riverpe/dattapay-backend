import type { User, Address } from "../../generated/prisma/client";
import { VALID_ADMIN_TOKEN } from "../helpers/jwt";

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

// Common ID constants
const ZYNK_ENTITY_ID = "zynk_entity_123";
const FUNDING_ACCOUNT_ID = "funding_account_123";

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
  accountStatus: "INITIAL",
  zynkEntityId: null,
  zynkFundingAccountId: null,
  created_at: new Date(),
  updated_at: new Date(),
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

export const ADMIN_TOKEN = VALID_ADMIN_TOKEN;
export const AUTH_TOKEN = "valid-auth-token";
