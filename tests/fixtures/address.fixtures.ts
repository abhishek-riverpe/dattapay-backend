import type { Address, User } from "../../generated/prisma/client";

// Base user for address relations
const baseUser: User = {
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

// Base address data
const baseAddressData: Address = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  addressLine1: "123 Main St",
  addressLine2: null,
  locality: "Downtown",
  city: "New York",
  state: "NY",
  country: "USA",
  postalCode: "10001",
  userId: baseUser.id,
  created_at: new Date(),
  updated_at: new Date(),
};

// Address without user relation
export const mockAddress = {
  ...baseAddressData,
};

// Address with user relation (for service returns)
export const mockAddressWithUser = {
  ...baseAddressData,
  user: baseUser,
};

// Mock user for auth middleware
export const mockUser = {
  ...baseUser,
  address: null,
};

// Valid create address payload
export const validCreateAddressPayload = {
  addressLine1: "456 Oak Avenue",
  addressLine2: "Suite 100",
  locality: "Midtown",
  city: "Los Angeles",
  state: "CA",
  country: "USA",
  postalCode: "90001",
};

// Valid update address payload
export const validUpdateAddressPayload = {
  addressLine1: "789 Updated St",
  city: "San Francisco",
};

// Partial update payload
export const partialUpdatePayload = {
  city: "Chicago",
};

// Invalid payload - missing required fields
export const invalidCreateAddressPayload = {
  addressLine1: "123 Main St",
  // Missing: locality, city, state, country, postalCode
};

// Invalid payload - empty string for required field
export const emptyFieldPayload = {
  addressLine1: "",
  locality: "Downtown",
  city: "New York",
  state: "NY",
  country: "USA",
  postalCode: "10001",
};

// Invalid payload - exceeds max length
export const exceedsMaxLengthPayload = {
  addressLine1: "a".repeat(300), // Max is 255
  locality: "Downtown",
  city: "New York",
  state: "NY",
  country: "USA",
  postalCode: "10001",
};

export const ADMIN_TOKEN = "test-admin-token";
export const AUTH_TOKEN = "valid-auth-token";
