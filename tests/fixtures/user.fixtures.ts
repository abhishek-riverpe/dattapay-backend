import type { User } from "../../generated/prisma/client";
import { VALID_ADMIN_TOKEN } from "../helpers/jwt";

// Base user data without address
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

// User with null address (for service return types that include address relation)
export const mockUser = {
  ...baseUserData,
  address: null,
};

export const mockUserWithAddress = {
  ...baseUserData,
  address: {
    id: "660e8400-e29b-41d4-a716-446655440001",
    addressLine1: "123 Main St",
    addressLine2: null,
    locality: "Downtown",
    city: "New York",
    state: "NY",
    country: "USA",
    postalCode: "10001",
    userId: baseUserData.id,
    created_at: new Date(),
    updated_at: new Date(),
  },
};

export const validCreateUserPayload = {
  clerkUserId: "clerk_user_new",
  firstName: "Jane",
  lastName: "Smith",
  email: "jane.smith@example.com",
  publicKey: "pub_key_456",
  phoneNumberPrefix: "+1",
  phoneNumber: "5559876543",
  nationality: "US",
  dateOfBirth: "1995-05-20",
};

export const validUpdateUserPayload = {
  firstName: "John Updated",
  lastName: "Doe Updated",
};

export const invalidCreateUserPayload = {
  firstName: "John",
  // Missing required fields
};

export const ADMIN_TOKEN = VALID_ADMIN_TOKEN;
export const AUTH_TOKEN = "valid-auth-token";
