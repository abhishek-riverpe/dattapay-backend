import type { User, Address } from "../../generated/prisma/client";

// Common ID constants
export const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
export const ADDRESS_ID = "660e8400-e29b-41d4-a716-446655440001";
export const ZYNK_ENTITY_ID = "zynk_entity_123";
export const FUNDING_ACCOUNT_ID = "funding_account_123";

// Base address for user relations
export const baseAddress: Address = {
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
export const baseUserData: User = {
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

// Common mock user with address
export const baseMockUser = {
  ...baseUserData,
  address: baseAddress,
};

// Common tokens
export { VALID_ADMIN_TOKEN as ADMIN_TOKEN } from "../helpers/jwt";
export const AUTH_TOKEN = "valid-auth-token";
