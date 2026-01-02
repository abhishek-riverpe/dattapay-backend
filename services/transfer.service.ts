import crypto from "node:crypto";
import AppError from "../lib/AppError";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import transferRepository from "../repositories/transfer.repository";
import type {
  SimulateTransferInput,
  TransferInput,
} from "../schemas/transfer.schema";

// In-memory cache for executionId→userId mapping with TTL
// Entries expire after 30 minutes (Zynk validUntil is typically shorter)
const EXECUTION_CACHE_TTL_MS = 30 * 60 * 1000;
const executionOwnershipCache = new Map<
  string,
  { userId: string; expiresAt: number }
>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of executionOwnershipCache) {
    if (value.expiresAt < now) {
      executionOwnershipCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

class TransferService {
  async simulateTransfer(userId: string, data: SimulateTransferInput) {
    // Get user and validate zynkEntityId
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new AppError(400, "User must complete KYC before making transfers");
    }

    // Find user's non-custodial wallet (source account)
    const sourceAccount =
      await externalAccountsRepository.findNonCustodialWallet(userId);
    if (!sourceAccount) {
      throw new AppError(
        400,
        "User does not have a wallet. Please create a wallet first."
      );
    }

    if (!sourceAccount.zynkExternalAccountId) {
      throw new AppError(400, "Source wallet is not properly configured");
    }

    // Find destination external account
    const destinationAccount = await externalAccountsRepository.findById(
      data.externalAccountId,
      userId
    );
    if (!destinationAccount) {
      throw new AppError(404, "Destination external account not found");
    }

    // Validate destination is withdrawal type
    if (destinationAccount.type !== "withdrawal") {
      throw new AppError(
        400,
        "Destination account must be a withdrawal type external account"
      );
    }

    if (!destinationAccount.zynkExternalAccountId) {
      throw new AppError(400, "Destination account is not properly configured");
    }

    // Generate transaction ID
    const transactionId = `txn_${crypto.randomUUID().replaceAll("-", "_")}`;

    // Determine amount (prefer exactAmountIn if both provided)
    const exactAmountIn = data.exactAmountIn;
    const exactAmountOut = data.exactAmountIn ? undefined : data.exactAmountOut;

    // Call Zynk simulate API
    const response = await transferRepository.simulateTransfer({
      transactionId,
      fromEntityId: user.zynkEntityId,
      fromAccountId: sourceAccount.zynkExternalAccountId,
      toEntityId: user.zynkEntityId,
      toAccountId: destinationAccount.zynkExternalAccountId,
      exactAmountIn,
      exactAmountOut,
      depositMemo: data.depositMemo,
    });

    // Store executionId→userId mapping for ownership validation
    executionOwnershipCache.set(response.data.executionId, {
      userId,
      expiresAt: Date.now() + EXECUTION_CACHE_TTL_MS,
    });

    return {
      executionId: response.data.executionId,
      payloadToSign: response.data.payloadToSign,
      quote: response.data.quote,
      validUntil: response.data.validUntil,
    };
  }

  async transfer(userId: string, data: TransferInput) {
    // Validate that the user owns this executionId
    const ownership = executionOwnershipCache.get(data.executionId);
    if (!ownership) {
      throw new AppError(400, "Invalid or expired execution ID");
    }

    if (ownership.userId !== userId) {
      throw new AppError(403, "You do not have permission to execute this transfer");
    }

    // Check if expired
    if (ownership.expiresAt < Date.now()) {
      executionOwnershipCache.delete(data.executionId);
      throw new AppError(400, "Transfer execution has expired");
    }

    // Call Zynk transfer API
    const response = await transferRepository.executeTransfer({
      executionId: data.executionId,
      payloadSignature: data.signature,
      transferAcknowledgement: "true",
      signatureType: "ApiKey",
    });

    // Remove from cache after successful execution
    executionOwnershipCache.delete(data.executionId);

    return {
      executionId: response.data.executionId,
      message: response.data.message,
    };
  }
}

export default new TransferService();
