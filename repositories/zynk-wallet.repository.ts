import { AxiosError } from "axios";
import zynkClient from "../lib/zynk-client";
import AppError from "../lib/AppError";

// ============================================
// Request/Response Interfaces
// ============================================

interface ZynkErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: string;
  };
}

// Register Auth
interface RegisterAuthResponse {
  success: boolean;
  data: {
    otpId: string;
  };
}

// Prepare Wallet - entityId goes in URL path (matches FastAPI)
interface PrepareWalletRequest {
  walletName: string;
  chain: string;
}

interface PrepareWalletResponse {
  success: boolean;
  data: {
    payloadId: string;
    payloadToSign: string;
    rpId: string;
  };
}

// Submit Wallet
interface SubmitWalletRequest {
  payloadId: string;
  signature: string;
  signatureType?: string;
}

interface SubmitWalletResponse {
  success: boolean;
  data: {
    walletId: string;
    addresses: string[];
  };
}

// Prepare Account
interface PrepareAccountRequest {
  chain: string;
}

interface PrepareAccountResponse {
  success: boolean;
  data: {
    payloadId: string;
    payloadToSign: string;
    rpId: string;
  };
}

// Submit Account
interface SubmitAccountRequest {
  payloadId: string;
  signature: string;
  signatureType?: string;
}

interface WalletAccountData {
  address: string;
  curve: string;
  pathFormat: string;
  path: string;
  addressFormat: string;
}

interface SubmitAccountResponse {
  success: boolean;
  data: {
    walletId: string;
    account: WalletAccountData;
    address: string;
  };
}

// Get Wallet
interface GetWalletResponse {
  success: boolean;
  data: {
    walletId: string;
    walletName: string;
    chain: string;
    status: string;
    accounts: WalletAccountData[];
  };
}

// Get Balances
interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdValue?: string;
}

interface GetBalancesResponse {
  success: boolean;
  data: {
    balances: TokenBalance[];
  };
}

// Get Transactions
interface Transaction {
  hash: string;
  type: string;
  status: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  tokenSymbol?: string;
  fee?: string;
}

interface GetTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    total: number;
  };
}

// ============================================
// Repository Class
// ============================================

class ZynkWalletRepository {
  /**
   * Handle Zynk API errors consistently
   */
  private handleError(error: unknown, defaultMessage: string): never {
    if (error instanceof AxiosError && error.response) {
      const zynkError = error.response.data as ZynkErrorResponse;

      if (zynkError?.error) {
        const errorMessage = zynkError.error.details || zynkError.error.message;
        throw new AppError(zynkError.error.code, errorMessage);
      }

      throw new AppError(error.response.status, defaultMessage);
    }

    throw new AppError(500, "Failed to connect to Zynk API");
  }

  /**
   * Register email-based authentication with Zynk
   * This automatically initiates OTP
   */
  async registerAuth(
    entityId: string,
    email: string
  ): Promise<RegisterAuthResponse> {
    try {
      const response = await zynkClient.post<RegisterAuthResponse>(
        `/api/v1/wallets/${entityId}/register-auth`,
        {
          authType: "Email_Auth",
          authPayload: {
            email: email,
          },
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to register auth");
    }
  }

  /**
   * Prepare wallet creation - get payload to sign
   * POST /api/v1/wallets/{entityId}/create/prepare
   */
  async prepareWallet(
    entityId: string,
    data: PrepareWalletRequest
  ): Promise<PrepareWalletResponse> {
    try {
      const response = await zynkClient.post<PrepareWalletResponse>(
        `/api/v1/wallets/${entityId}/create/prepare`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to prepare wallet creation");
    }
  }

  /**
   * Submit wallet creation with signature
   * POST /api/v1/wallets/create/submit
   */
  async submitWallet(data: SubmitWalletRequest): Promise<SubmitWalletResponse> {
    try {
      const response = await zynkClient.post<SubmitWalletResponse>(
        `/api/v1/wallets/create/submit`,
        {
          ...data,
          signatureType: data.signatureType || "ApiKey",
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to submit wallet creation");
    }
  }

  /**
   * Prepare account creation - get payload to sign
   * POST /api/v1/wallets/{walletId}/accounts/prepare
   */
  async prepareAccount(
    walletId: string,
    data: PrepareAccountRequest
  ): Promise<PrepareAccountResponse> {
    try {
      const response = await zynkClient.post<PrepareAccountResponse>(
        `/api/v1/wallets/${walletId}/accounts/prepare`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to prepare account creation");
    }
  }

  /**
   * Submit account creation with signature
   * POST /api/v1/wallets/accounts/submit
   */
  async submitAccount(
    data: SubmitAccountRequest
  ): Promise<SubmitAccountResponse> {
    try {
      const response = await zynkClient.post<SubmitAccountResponse>(
        `/api/v1/wallets/accounts/submit`,
        {
          ...data,
          signatureType: data.signatureType || "ApiKey",
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, "Failed to submit account creation");
    }
  }

  /**
   * Get wallet details from Zynk
   */
  async getWallet(walletId: string): Promise<GetWalletResponse> {
    try {
      const response = await zynkClient.get<GetWalletResponse>(
        `/api/v1/wallets/${walletId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new AppError(404, "Wallet not found");
      }
      this.handleError(error, "Failed to get wallet details");
    }
  }

  /**
   * Get wallet token balances
   */
  async getBalances(walletId: string): Promise<GetBalancesResponse> {
    try {
      const response = await zynkClient.get<GetBalancesResponse>(
        `/api/v1/wallets/${walletId}/balances`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new AppError(404, "Wallet not found");
      }
      this.handleError(error, "Failed to get wallet balances");
    }
  }

  /**
   * Get transaction history for a specific address
   */
  async getTransactions(
    walletId: string,
    address: string,
    options?: { limit?: number; offset?: number }
  ): Promise<GetTransactionsResponse> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      const queryString = params.toString();
      const url = `/api/v1/wallets/${walletId}/${address}/transactions${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await zynkClient.get<GetTransactionsResponse>(url);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new AppError(404, "Wallet or address not found");
      }
      this.handleError(error, "Failed to get transactions");
    }
  }
}

export default new ZynkWalletRepository();
export type {
  RegisterAuthResponse,
  PrepareWalletRequest,
  PrepareWalletResponse,
  SubmitWalletRequest,
  SubmitWalletResponse,
  PrepareAccountRequest,
  PrepareAccountResponse,
  SubmitAccountRequest,
  SubmitAccountResponse,
  GetWalletResponse,
  GetBalancesResponse,
  GetTransactionsResponse,
  WalletAccountData,
  TokenBalance,
  Transaction,
};
