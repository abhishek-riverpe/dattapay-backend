import type { Wallet, WalletAccount } from "../../generated/prisma/client";
import {
  baseAddress,
  baseUserData,
  USER_ID,
} from "./common.fixtures";

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
  userId: USER_ID,
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

// Common test constants
const VALID_PAYLOAD_ID = "payload_123";
const VALID_SIGNATURE = "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...";

// Valid submit wallet payload
export const validSubmitPayload = {
  payloadId: VALID_PAYLOAD_ID,
  signature: VALID_SIGNATURE,
};

// Invalid submit payloads
export const invalidSubmitPayloads = {
  missingPayloadId: { signature: VALID_SIGNATURE },
  missingSignature: { payloadId: VALID_PAYLOAD_ID },
  empty: {},
} as const;

// Valid get transactions query params
export const validTransactionsQuery = {
  limit: 20,
  offset: 0,
};

// Invalid get transactions query params
export const invalidTransactionsQueries = {
  negativeLimit: { limit: -5 },
  exceedsMax: { limit: 150 },
  negativeOffset: { offset: -10 },
} as const;

export { ADMIN_TOKEN, AUTH_TOKEN } from "./common.fixtures";
