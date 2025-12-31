import crypto from "crypto";
import Error from "../lib/Error";
import userRepository from "../repositories/user.repository";
import externalAccountsRepository from "../repositories/external-accounts.repository";
import transferRepository from "../repositories/transfer.repository";
import type { SimulateTransferInput, TransferInput } from "../schemas/transfer.schema";

class TransferService {
  async simulateTransfer(userId: string, data: SimulateTransferInput) {
    // Get user and validate zynkEntityId
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(404, "User not found");
    }

    if (!user.zynkEntityId) {
      throw new Error(400, "User must complete KYC before making transfers");
    }

    // Find user's non-custodial wallet (source account)
    const sourceAccount = await externalAccountsRepository.findNonCustodialWallet(userId);
    if (!sourceAccount) {
      throw new Error(400, "User does not have a wallet. Please create a wallet first.");
    }

    if (!sourceAccount.zynkExternalAccountId) {
      throw new Error(400, "Source wallet is not properly configured");
    }

    // Find destination external account
    const destinationAccount = await externalAccountsRepository.findById(
      data.externalAccountId,
      userId
    );
    if (!destinationAccount) {
      throw new Error(404, "Destination external account not found");
    }

    // Validate destination is withdrawal type
    if (destinationAccount.type !== "withdrawal") {
      throw new Error(400, "Destination account must be a withdrawal type external account");
    }

    if (!destinationAccount.zynkExternalAccountId) {
      throw new Error(400, "Destination account is not properly configured");
    }

    // Generate transaction ID
    const transactionId = `txn_${crypto.randomUUID().replace(/-/g, "_")}`;

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

    return {
      executionId: response.data.executionId,
      payloadToSign: response.data.payloadToSign,
      quote: response.data.quote,
      validUntil: response.data.validUntil,
    };
  }

  async transfer(data: TransferInput) {
    // Call Zynk transfer API
    const response = await transferRepository.executeTransfer({
      executionId: data.executionId,
      payloadSignature: data.signature,
      transferAcknowledgement: "true",
      signatureType: "ApiKey",
    });

    return {
      executionId: response.data.executionId,
      message: response.data.message,
    };
  }
}

export default new TransferService();
