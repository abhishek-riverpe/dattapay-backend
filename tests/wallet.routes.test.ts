import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Express, Router } from "express";
import request from "supertest";
import AppError from "../lib/AppError";
import userService from "../services/user.service";
import walletService from "../services/wallet.service";
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
import {
  createAdminMiddlewareTests,
  createAuthMiddlewareTests,
  createResponseFormatTests,
  expectErrorResponse,
  expectSuccessResponse,
} from "./helpers";

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
    jest.restoreAllMocks();
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/wallet",
      routes: walletRoutes,
    });

    // Wire spies to concrete services so controllers use our mocks
    jest
      .spyOn(userService, "getByClerkUserId")
      .mockImplementation(mockGetByClerkUserId as never);
    jest
      .spyOn(walletService, "prepareWallet")
      .mockImplementation(mockPrepareWallet as never);
    jest
      .spyOn(walletService, "submitWallet")
      .mockImplementation(mockSubmitWallet as never);
    jest
      .spyOn(walletService, "prepareAccount")
      .mockImplementation(mockPrepareAccount as never);
    jest
      .spyOn(walletService, "submitAccount")
      .mockImplementation(mockSubmitAccount as never);
    jest
      .spyOn(walletService, "getWallet")
      .mockImplementation(mockGetWallet as never);
    jest
      .spyOn(walletService, "getTransactions")
      .mockImplementation(mockGetTransactions as never);

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
  // Admin Middleware Tests (using shared helper)
  // ===========================================
  createAdminMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/wallet",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () =>
      mockGetWallet.mockResolvedValue(mockWalletWithAccount),
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Auth Middleware Tests (using shared helper)
  // ===========================================
  createAuthMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/wallet",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ==========================================
  // Shared Validation Tests (wallet/submit & accounts/submit)
  // ==========================================
  describe.each([
    { endpoint: "/api/wallet/submit", name: "wallet submit" },
    { endpoint: "/api/wallet/accounts/submit", name: "account submit" },
  ])("$name - Validation", ({ endpoint }) => {
    it.each([
      {
        payload: invalidSubmitPayloads.missingPayloadId,
        message: "Payload ID is required",
        desc: "payloadId is missing",
      },
      {
        payload: invalidSubmitPayloads.missingSignature,
        message: "Signature is required",
        desc: "signature is missing",
      },
    ])("should return 400 when $desc", async ({ payload, message }) => {
      const response = await authRequest("post", endpoint).send(payload);
      expectErrorResponse(response, 400, message);
    });
  });

  // ==========================================
  // POST /api/wallet/prepare
  // ==========================================
  describe("POST /api/wallet/prepare", () => {
    it("should return 200 with payload to sign on success", async () => {
      mockPrepareWallet.mockResolvedValue(mockPrepareWalletResponse);

      const response = await authRequest("post", "/api/wallet/prepare");

      expectSuccessResponse(
        response,
        200,
        "Please sign the payload to create a wallet"
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBe(
        mockPrepareWalletResponse.payloadId
      );
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it.each([
      {
        error: new AppError(
          400,
          "User must complete KYC before creating a wallet"
        ),
        message: "KYC",
        desc: "user has not completed KYC",
      },
      {
        error: new AppError(400, "User already has a wallet"),
        message: "already has a wallet",
        desc: "user already has a wallet",
      },
    ])("should return 400 when $desc", async ({ error, message }) => {
      mockPrepareWallet.mockRejectedValue(error);

      const response = await authRequest("post", "/api/wallet/prepare");
      expectErrorResponse(response, 400, message);
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

    it.each([
      {
        error: new AppError(
          400,
          "User must complete KYC before creating a wallet"
        ),
        desc: "user has not completed KYC",
      },
      {
        error: new AppError(400, "User already has a wallet"),
        desc: "user already has a wallet",
      },
    ])("should return 400 when $desc", async ({ error }) => {
      mockSubmitWallet.mockRejectedValue(error);

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

      const response = await authRequest(
        "post",
        "/api/wallet/accounts/prepare"
      );

      expectSuccessResponse(
        response,
        200,
        "Please sign the payload to create an account"
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBeDefined();
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it.each([
      {
        error: new AppError(
          404,
          "Wallet not found. Please create a wallet first."
        ),
        status: 404,
        message: "Wallet not found",
        desc: "wallet not found",
      },
      {
        error: new AppError(400, "Wallet already has an account"),
        status: 400,
        message: "already has an account",
        desc: "wallet already has an account",
      },
    ])(
      "should return $status when $desc",
      async ({ error, status, message }) => {
        mockPrepareAccount.mockRejectedValue(error);

        const response = await authRequest(
          "post",
          "/api/wallet/accounts/prepare"
        );
        expectErrorResponse(response, status, message);
      }
    );
  });

  // ==========================================
  // POST /api/wallet/accounts/submit
  // ==========================================
  describe("POST /api/wallet/accounts/submit", () => {
    it("should return 200 with account on success", async () => {
      mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

      const response = await authRequest(
        "post",
        "/api/wallet/accounts/submit"
      ).send(validSubmitPayload);

      expectSuccessResponse(response, 200, "Account created successfully");
      expect(response.body.data).toBeDefined();
    });

    it.each([
      {
        error: new AppError(
          404,
          "Wallet not found. Please create a wallet first."
        ),
        status: 404,
        desc: "wallet not found",
      },
      {
        error: new AppError(400, "Wallet already has an account"),
        status: 400,
        desc: "wallet already has an account",
      },
    ])("should return $status when $desc", async ({ error, status }) => {
      mockSubmitAccount.mockRejectedValue(error);

      const response = await authRequest(
        "post",
        "/api/wallet/accounts/submit"
      ).send(validSubmitPayload);
      expectErrorResponse(response, status);
    });

    it("should pass correct data to service", async () => {
      mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

      await authRequest("post", "/api/wallet/accounts/submit").send(
        validSubmitPayload
      );

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
        new AppError(404, "Wallet not found. Please create a wallet first.")
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
        {
          query: { limit: -5 },
          desc: "limit is negative",
          contains: "at least 1",
        },
        {
          query: { limit: 150 },
          desc: "limit exceeds max",
          contains: "exceed 100",
        },
        {
          query: { offset: -10 },
          desc: "offset is negative",
          contains: "negative",
        },
      ])("should return 400 when $desc", async ({ query, contains }) => {
        const response = await authRequest(
          "get",
          "/api/wallet/transactions"
        ).query(query);
        expectErrorResponse(response, 400, contains);
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with transactions on success", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await authRequest("get", "/api/wallet/transactions");

        expectSuccessResponse(
          response,
          200,
          "Transactions retrieved successfully"
        );
        expect(response.body.data).toBeDefined();
        expect(response.body.data.transactions).toBeDefined();
        expect(response.body.data.total).toBe(2);
      });

      it("should return 200 with custom limit and offset", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await authRequest(
          "get",
          "/api/wallet/transactions"
        ).query({ limit: 50, offset: 10 });

        expectSuccessResponse(response, 200);
        expect(mockGetTransactions).toHaveBeenCalledWith(mockUser.id, {
          limit: 50,
          offset: 10,
        });
      });

      it.each([
        {
          error: "Wallet not found. Please create a wallet first.",
          desc: "wallet not found",
        },
        { error: "Wallet account not found", desc: "wallet account not found" },
      ])("should return 404 when $desc", async ({ error }) => {
        mockGetTransactions.mockRejectedValue(new AppError(404, error));

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
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/wallet",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () =>
      mockGetWallet.mockResolvedValue(mockWalletWithAccount),
    setupErrorMock: () =>
      mockGetWallet.mockRejectedValue(new Error("Database connection failed")),
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

      const response = await authRequest(
        "get",
        "/api/wallet/transactions?limit=25"
      );

      expectSuccessResponse(response, 200);
    });
  });
});
