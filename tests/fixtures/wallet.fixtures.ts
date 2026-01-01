import type { User, Wallet, WalletAccount, Address } from "../../generated/prisma/client";
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

// Base user data with KYC completed
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

// User for auth middleware (with KYC completed)
export const mockUser = {
  ...baseUserData,
  address: baseAddress,
};

// User without zynk entity (KYC not completed)
export const mockUserWithoutZynkEntity = {
  ...baseUserData,
  zynkEntityId: null,
  zynkFundingAccountId: null,
  address: baseAddress,
};

// Base wallet account
const baseWalletAccount: WalletAccount = {
  id: "880e8400-e29b-41d4-a716-446655440002",
  walletId: "880e8400-e29b-41d4-a716-446655440000",
  address: "EzGZ4e5UxEsUmeq2Gk8kxSDHoBxJ9eN4XZA4nW317AvC",
  curve: "CURVE_SECP256K1",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/501'/0'/0'",
  addressFormat: "ADDRESS_FORMAT_SOLANA",
  created_at: new Date(),
  updated_at: new Date(),
};

// Base wallet data
const baseWalletData: Wallet = {
  id: "880e8400-e29b-41d4-a716-446655440000",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  zynkWalletId: "zynk_wallet_123",
  walletName: "My Wallet",
  chain: "SOLANA",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
};

// Wallet without account
export const mockWalletWithoutAccount = {
  ...baseWalletData,
  account: null,
};

// Wallet with account
export const mockWalletWithAccount = {
  ...baseWalletData,
  account: baseWalletAccount,
};

// Mock wallet account
export const mockWalletAccount = {
  ...baseWalletAccount,
};

// Mock prepare wallet response
export const mockPrepareWalletResponse = {
  payloadId: "payload_123",
  payloadToSign: '{"type":"ACTIVITY_TYPE_CREATE_WALLET_V2","parameters":{...}}',
};

// Mock prepare account response
export const mockPrepareAccountResponse = {
  payloadId: "payload_456",
  payloadToSign: '{"type":"ACTIVITY_TYPE_CREATE_WALLET_ACCOUNTS_V2","parameters":{...}}',
};

// Mock created wallet response
export const mockCreatedWallet = {
  ...baseWalletData,
  account: null,
};

// Mock created account response
export const mockCreatedAccount = {
  ...baseWalletAccount,
};

// Mock transactions response
export const mockTransactionsResponse = {
  wallet: {
    id: baseWalletData.id,
    walletName: baseWalletData.walletName,
    address: baseWalletAccount.address,
  },
  transactions: [
    {
      id: "txn_001",
      type: "TRANSFER",
      amount: 100.5,
      currency: "USDC",
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
    },
    {
      id: "txn_002",
      type: "TRANSFER",
      amount: 50.25,
      currency: "USDC",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
  ],
  total: 2,
};

// Valid submit wallet payload
export const validSubmitPayload = {
  payloadId: "payload_123",
  signature: "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...",
};

// Invalid submit payloads
export const invalidSubmitPayloadMissingPayloadId = {
  signature: "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...",
};

export const invalidSubmitPayloadMissingSignature = {
  payloadId: "payload_123",
};

export const invalidSubmitPayloadEmpty = {};

// Valid get transactions query params
export const validTransactionsQuery = {
  limit: 20,
  offset: 0,
};

// Invalid get transactions query params
export const invalidTransactionsQueryNegativeLimit = {
  limit: -5,
};

export const invalidTransactionsQueryExceedsMax = {
  limit: 150,
};

export const invalidTransactionsQueryNegativeOffset = {
  offset: -10,
};

export const ADMIN_TOKEN = VALID_ADMIN_TOKEN;
export const AUTH_TOKEN = "valid-auth-token";
