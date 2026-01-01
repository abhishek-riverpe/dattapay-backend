import type { User, ExternalAccount, Address } from "../../generated/prisma/client";

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

// Base external account (non-custodial wallet - source)
const baseNonCustodialWallet: ExternalAccount = {
  id: "770e8400-e29b-41d4-a716-446655440000",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  label: "My Wallet",
  zynkExternalAccountId: "zynk_ext_acc_source_123",
  type: "non_custodial",
  walletId: "wallet_123",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

// Non-custodial wallet for source
export const mockSourceWallet = {
  ...baseNonCustodialWallet,
};

// Non-custodial wallet without zynk ID
export const mockSourceWalletWithoutZynk = {
  ...baseNonCustodialWallet,
  zynkExternalAccountId: null,
};

// Destination external account (withdrawal type)
const baseDestinationAccount: ExternalAccount = {
  id: "770e8400-e29b-41d4-a716-446655440001",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
  label: "Destination Wallet",
  zynkExternalAccountId: "zynk_ext_acc_dest_123",
  type: "withdrawal",
  walletId: "wallet_456",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
  deleted_at: null,
};

// Destination account (withdrawal type)
export const mockDestinationAccount = {
  ...baseDestinationAccount,
};

// Destination account with wrong type
export const mockDestinationAccountWrongType = {
  ...baseDestinationAccount,
  type: "deposit",
};

// Destination account without zynk ID
export const mockDestinationAccountWithoutZynk = {
  ...baseDestinationAccount,
  zynkExternalAccountId: null,
};

// Valid simulate transfer payload
export const validSimulatePayload = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
  exactAmountIn: 100.5,
  depositMemo: "Test transfer",
};

// Valid simulate payload with exactAmountOut
export const validSimulatePayloadWithAmountOut = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
  exactAmountOut: 99.5,
  depositMemo: "Test transfer",
};

// Invalid simulate payloads
export const invalidSimulatePayloadMissingId = {
  exactAmountIn: 100.5,
};

export const invalidSimulatePayloadInvalidUuid = {
  externalAccountId: "invalid-uuid",
  exactAmountIn: 100.5,
};

export const invalidSimulatePayloadMissingAmount = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
};

export const invalidSimulatePayloadNegativeAmount = {
  externalAccountId: "770e8400-e29b-41d4-a716-446655440001",
  exactAmountIn: -50,
};

// Valid transfer payload
export const validTransferPayload = {
  executionId: "cexec_a8ddf280_ac0b_43c0_bf35_9b3192feb059",
  signature: "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...",
};

// Invalid transfer payloads
export const invalidTransferPayloadMissingExecutionId = {
  signature: "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...",
};

export const invalidTransferPayloadMissingSignature = {
  executionId: "cexec_a8ddf280_ac0b_43c0_bf35_9b3192feb059",
};

export const invalidTransferPayloadEmpty = {};

// Mock Zynk simulate response
export const mockSimulateResponse = {
  executionId: "cexec_a8ddf280_ac0b_43c0_bf35_9b3192feb059",
  payloadToSign: '{"parameters":{"signWith":"EzGZ..."},"type":"ACTIVITY_TYPE_SIGN_TRANSACTION_V2"}',
  quote: {
    inAmount: { amount: 100.5, currency: "USDC" },
    outAmount: { amount: 100.5, currency: "USDC" },
    exchangeRate: { rate: 1, conversion: "1 USDC = 1 USDC" },
    fees: {
      partnerFees: { amount: 0, currency: "USDC" },
      zynkFees: { amount: 0, currency: "USDC" },
      totalFees: { amount: 0, currency: "USDC" },
    },
  },
  validUntil: "2025-12-30T19:53:15.093Z",
};

// Mock Zynk transfer response
export const mockTransferResponse = {
  executionId: "exec_67d58fee2a31c2e919701a10",
  message: "Transaction execution started successfully",
};

export const ADMIN_TOKEN = "test-admin-token";
export const AUTH_TOKEN = "valid-auth-token";

// Valid UUIDs for tests
export const VALID_EXTERNAL_ACCOUNT_UUID = "770e8400-e29b-41d4-a716-446655440001";
export const NON_EXISTENT_UUID = "990e8400-e29b-41d4-a716-446655440000";
