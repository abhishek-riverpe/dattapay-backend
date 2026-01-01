import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Express, Router } from "express";
import type { Response } from "supertest";
import request from "supertest";
import CustomError from "../lib/Error";
import {
  ADMIN_TOKEN,
  AUTH_TOKEN,
  invalidSubmitPayloads,
  mockCreatedAccount,
  mockCreatedWallet,
  mockPrepareAccountResponse,
  mockPrepareWalletResponse,
  mockTransactionsResponse,
  mockUser,
  mockWalletWithAccount,
  mockWalletWithoutAccount,
  validSubmitPayload,
} from "./fixtures/wallet.fixtures";
import type { TestAppConfig } from "./helpers";

// Response assertion helpers to reduce duplication
function expectErrorResponse(
  response: Response,
  statusCode: number,
  messageContains?: string
) {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  if (messageContains) {
    expect(response.body.message).toContain(messageContains);
  }
}

function expectSuccessResponse(
  response: Response,
  statusCode: number,
  message?: string
) {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  if (message) {
    expect(response.body.message).toBe(message);
  }
}

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPrepareWallet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSubmitWallet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPrepareAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSubmitAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetWallet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetTransactions = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/wallet.service", () => ({
  default: {
    prepareWallet: mockPrepareWallet,
    submitWallet: mockSubmitWallet,
    prepareAccount: mockPrepareAccount,
    submitAccount: mockSubmitAccount,
    getWallet: mockGetWallet,
    getTransactions: mockGetTransactions,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let walletRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  walletRoutes = (await import("../routes/wallet.routes")).default;
});

describe("Wallet Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/wallet",
      routes: walletRoutes,
    });

    // Default mock implementations for auth
    mockVerifyToken.mockResolvedValue({ sub: "clerk_user_123" });
    mockGetByClerkUserId.mockResolvedValue(mockUser);
  });

  // Helper to create authenticated request
  function authRequest(method: "get" | "post", endpoint: string) {
    return request(app)
      [method](endpoint)
      .set("x-api-token", ADMIN_TOKEN)
      .set("x-auth-token", AUTH_TOKEN);
  }

  // ===========================================
  // Admin Middleware Tests
  // ===========================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app)
        .get("/api/wallet")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403, "Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403);
    });

    it("should allow access with valid x-api-token", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await authRequest("get", "/api/wallet");

      expect([200, 201]).toContain(response.status);
    });
  });

  // ===========================================
  // Auth Middleware Tests
  // ===========================================
  describe("Auth Middleware", () => {
    it("should return 401 when x-auth-token header is missing", async () => {
      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN);

      expectErrorResponse(response, 401, "token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expectErrorResponse(response, 401);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await authRequest("get", "/api/wallet");

      expectErrorResponse(response, 401);
    });
  });

  // ==========================================
  // Shared Validation Tests (wallet/submit & accounts/submit)
  // ==========================================
  describe.each([
    { endpoint: "/api/wallet/submit", name: "wallet submit" },
    { endpoint: "/api/wallet/accounts/submit", name: "account submit" },
  ])("$name - Validation", ({ endpoint }) => {
    it("should return 400 when payloadId is missing", async () => {
      const response = await authRequest("post", endpoint).send(
        invalidSubmitPayloads.missingPayloadId
      );

      expectErrorResponse(response, 400, "Payload ID is required");
    });

    it("should return 400 when signature is missing", async () => {
      const response = await authRequest("post", endpoint).send(
        invalidSubmitPayloads.missingSignature
      );

      expectErrorResponse(response, 400, "Signature is required");
    });
  });

  // ==========================================
  // POST /api/wallet/prepare
  // ==========================================
  describe("POST /api/wallet/prepare", () => {
    it("should return 200 with payload to sign on success", async () => {
      mockPrepareWallet.mockResolvedValue(mockPrepareWalletResponse);

      const response = await authRequest("post", "/api/wallet/prepare");

      expectSuccessResponse(response, 200, "Please sign the payload to create a wallet");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBe(mockPrepareWalletResponse.payloadId);
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it("should return 400 when user has not completed KYC", async () => {
      mockPrepareWallet.mockRejectedValue(
        new CustomError(400, "User must complete KYC before creating a wallet")
      );

      const response = await authRequest("post", "/api/wallet/prepare");

      expectErrorResponse(response, 400, "KYC");
    });

    it("should return 400 when user already has a wallet", async () => {
      mockPrepareWallet.mockRejectedValue(
        new CustomError(400, "User already has a wallet")
      );

      const response = await authRequest("post", "/api/wallet/prepare");

      expectErrorResponse(response, 400, "already has a wallet");
    });

    it("should pass user id to service", async () => {
      mockPrepareWallet.mockResolvedValue(mockPrepareWalletResponse);

      await authRequest("post", "/api/wallet/prepare");

      expect(mockPrepareWallet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // POST /api/wallet/submit
  // ==========================================
  describe("POST /api/wallet/submit", () => {
    it("should return 400 when body is empty", async () => {
      const response = await authRequest("post", "/api/wallet/submit").send(
        invalidSubmitPayloads.empty
      );

      expectErrorResponse(response, 400);
    });

    it("should return 200 with wallet on success", async () => {
      mockSubmitWallet.mockResolvedValue(mockCreatedWallet);

      const response = await authRequest("post", "/api/wallet/submit").send(
        validSubmitPayload
      );

      expectSuccessResponse(response, 200, "Wallet created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should return 400 when user has not completed KYC", async () => {
      mockSubmitWallet.mockRejectedValue(
        new CustomError(400, "User must complete KYC before creating a wallet")
      );

      const response = await authRequest("post", "/api/wallet/submit").send(
        validSubmitPayload
      );

      expectErrorResponse(response, 400);
    });

    it("should return 400 when user already has a wallet", async () => {
      mockSubmitWallet.mockRejectedValue(
        new CustomError(400, "User already has a wallet")
      );

      const response = await authRequest("post", "/api/wallet/submit").send(
        validSubmitPayload
      );

      expectErrorResponse(response, 400);
    });

    it("should pass correct data to service", async () => {
      mockSubmitWallet.mockResolvedValue(mockCreatedWallet);

      await authRequest("post", "/api/wallet/submit").send(validSubmitPayload);

      expect(mockSubmitWallet).toHaveBeenCalledWith(
        mockUser.id,
        validSubmitPayload.payloadId,
        validSubmitPayload.signature
      );
    });
  });

  // ==========================================
  // POST /api/wallet/accounts/prepare
  // ==========================================
  describe("POST /api/wallet/accounts/prepare", () => {
    it("should return 200 with payload to sign on success", async () => {
      mockPrepareAccount.mockResolvedValue(mockPrepareAccountResponse);

      const response = await authRequest("post", "/api/wallet/accounts/prepare");

      expectSuccessResponse(response, 200, "Please sign the payload to create an account");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBeDefined();
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it("should return 404 when wallet not found", async () => {
      mockPrepareAccount.mockRejectedValue(
        new CustomError(404, "Wallet not found. Please create a wallet first.")
      );

      const response = await authRequest("post", "/api/wallet/accounts/prepare");

      expectErrorResponse(response, 404, "Wallet not found");
    });

    it("should return 400 when wallet already has an account", async () => {
      mockPrepareAccount.mockRejectedValue(
        new CustomError(400, "Wallet already has an account")
      );

      const response = await authRequest("post", "/api/wallet/accounts/prepare");

      expectErrorResponse(response, 400, "already has an account");
    });
  });

  // ==========================================
  // POST /api/wallet/accounts/submit
  // ==========================================
  describe("POST /api/wallet/accounts/submit", () => {
    it("should return 200 with account on success", async () => {
      mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

      const response = await authRequest("post", "/api/wallet/accounts/submit").send(
        validSubmitPayload
      );

      expectSuccessResponse(response, 200, "Account created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should return 404 when wallet not found", async () => {
      mockSubmitAccount.mockRejectedValue(
        new CustomError(404, "Wallet not found. Please create a wallet first.")
      );

      const response = await authRequest("post", "/api/wallet/accounts/submit").send(
        validSubmitPayload
      );

      expectErrorResponse(response, 404);
    });

    it("should return 400 when wallet already has an account", async () => {
      mockSubmitAccount.mockRejectedValue(
        new CustomError(400, "Wallet already has an account")
      );

      const response = await authRequest("post", "/api/wallet/accounts/submit").send(
        validSubmitPayload
      );

      expectErrorResponse(response, 400);
    });

    it("should pass correct data to service", async () => {
      mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

      await authRequest("post", "/api/wallet/accounts/submit").send(validSubmitPayload);

      expect(mockSubmitAccount).toHaveBeenCalledWith(
        mockUser.id,
        validSubmitPayload.payloadId,
        validSubmitPayload.signature
      );
    });
  });

  // ==========================================
  // GET /api/wallet
  // ==========================================
  describe("GET /api/wallet", () => {
    it("should return 200 with wallet on success", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await authRequest("get", "/api/wallet");

      expectSuccessResponse(response, 200, "Wallet retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockWalletWithAccount.id);
    });

    it("should return 404 when wallet not found", async () => {
      mockGetWallet.mockRejectedValue(
        new CustomError(404, "Wallet not found. Please create a wallet first.")
      );

      const response = await authRequest("get", "/api/wallet");

      expectErrorResponse(response, 404, "Wallet not found");
    });

    it("should pass user id to service", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      await authRequest("get", "/api/wallet");

      expect(mockGetWallet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // GET /api/wallet/transactions
  // ==========================================
  describe("GET /api/wallet/transactions", () => {
    describe("Validation", () => {
      it.each([
        { query: { limit: -5 }, desc: "limit is negative", contains: "at least 1" },
        { query: { limit: 150 }, desc: "limit exceeds max", contains: "exceed 100" },
        { query: { offset: -10 }, desc: "offset is negative", contains: "negative" },
      ])("should return 400 when $desc", async ({ query, contains }) => {
        const response = await authRequest("get", "/api/wallet/transactions").query(query);

        expectErrorResponse(response, 400, contains);
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with transactions on success", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await authRequest("get", "/api/wallet/transactions");

        expectSuccessResponse(response, 200, "Transactions retrieved successfully");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.transactions).toBeDefined();
        expect(response.body.data.total).toBe(2);
      });

      it("should return 200 with custom limit and offset", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await authRequest("get", "/api/wallet/transactions").query({
          limit: 50,
          offset: 10,
        });

        expectSuccessResponse(response, 200);
        expect(mockGetTransactions).toHaveBeenCalledWith(mockUser.id, {
          limit: 50,
          offset: 10,
        });
      });

      it.each([
        { error: "Wallet not found. Please create a wallet first.", desc: "wallet not found" },
        { error: "Wallet account not found", desc: "wallet account not found" },
      ])("should return 404 when $desc", async ({ error }) => {
        mockGetTransactions.mockRejectedValue(new CustomError(404, error));

        const response = await authRequest("get", "/api/wallet/transactions");

        expectErrorResponse(response, 404);
      });

      it("should use default limit and offset when not provided", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        await authRequest("get", "/api/wallet/transactions");

        expect(mockGetTransactions).toHaveBeenCalledWith(mockUser.id, {
          limit: 20,
          offset: 0,
        });
      });
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    beforeEach(() => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);
    });

    it("should always return success boolean and message string", async () => {
      const response = await authRequest("get", "/api/wallet");

      expect(typeof response.body.success).toBe("boolean");
      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      const response = await authRequest("get", "/api/wallet");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGetWallet.mockRejectedValue(new Error("Database connection failed"));

      const response = await authRequest("get", "/api/wallet");

      expectErrorResponse(response, 500);
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it("should handle empty transactions list", async () => {
      mockGetTransactions.mockResolvedValue({
        ...mockTransactionsResponse,
        transactions: [],
        total: 0,
      });

      const response = await authRequest("get", "/api/wallet/transactions");

      expectSuccessResponse(response, 200);
      expect(response.body.data.transactions).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it("should handle wallet without account", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithoutAccount);

      const response = await authRequest("get", "/api/wallet");

      expectSuccessResponse(response, 200);
      expect(response.body.data.account).toBeNull();
    });

    it("should handle limit as string query parameter", async () => {
      mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

      const response = await authRequest("get", "/api/wallet/transactions?limit=25");

      expectSuccessResponse(response, 200);
    });
  });
});
