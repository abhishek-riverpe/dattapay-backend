import type { ExternalAccount } from "../../generated/prisma/client";
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

// Base external account (non-custodial wallet - source)
const baseNonCustodialWallet: ExternalAccount = {
  id: "770e8400-e29b-41d4-a716-446655440000",
  userId: USER_ID,
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
  userId: USER_ID,
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

// Common test constants
const DEFAULT_AMOUNT = 100.5;
const DEFAULT_MEMO = "Test transfer";
const VALID_EXECUTION_ID = "cexec_a8ddf280_ac0b_43c0_bf35_9b3192feb059";
const VALID_SIGNATURE = "eyJwdWJsaWNLZXkiOiIwMjFiYWEwZD...";

// UUID constants (defined early for use in payloads)
export const VALID_EXTERNAL_ACCOUNT_UUID = "770e8400-e29b-41d4-a716-446655440001";
export const NON_EXISTENT_UUID = "990e8400-e29b-41d4-a716-446655440000";

// Valid simulate transfer payload
export const validSimulatePayload = {
  externalAccountId: VALID_EXTERNAL_ACCOUNT_UUID,
  exactAmountIn: DEFAULT_AMOUNT,
  depositMemo: DEFAULT_MEMO,
};

// Valid simulate payload with exactAmountOut
export const validSimulatePayloadWithAmountOut = {
  externalAccountId: VALID_EXTERNAL_ACCOUNT_UUID,
  exactAmountOut: 99.5,
  depositMemo: DEFAULT_MEMO,
};

// Invalid simulate payloads
export const invalidSimulatePayloads = {
  missingId: { exactAmountIn: DEFAULT_AMOUNT },
  invalidUuid: { externalAccountId: "invalid-uuid", exactAmountIn: DEFAULT_AMOUNT },
  missingAmount: { externalAccountId: VALID_EXTERNAL_ACCOUNT_UUID },
  negativeAmount: { externalAccountId: VALID_EXTERNAL_ACCOUNT_UUID, exactAmountIn: -50 },
} as const;

// Valid transfer payload
export const validTransferPayload = {
  executionId: VALID_EXECUTION_ID,
  signature: VALID_SIGNATURE,
};

// Invalid transfer payloads
export const invalidTransferPayloads = {
  missingExecutionId: { signature: VALID_SIGNATURE },
  missingSignature: { executionId: VALID_EXECUTION_ID },
  empty: {},
} as const;

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

export { ADMIN_TOKEN, AUTH_TOKEN } from "./common.fixtures";
