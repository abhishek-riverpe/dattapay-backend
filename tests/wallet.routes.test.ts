import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";
import type { Express, Router } from "express";
import request from "supertest";
import {
  mockUser,
  mockUserWithoutZynkEntity,
  mockWalletWithAccount,
  mockWalletWithoutAccount,
  mockPrepareWalletResponse,
  mockPrepareAccountResponse,
  mockCreatedWallet,
  mockCreatedAccount,
  mockTransactionsResponse,
  validSubmitPayload,
  invalidSubmitPayloadMissingPayloadId,
  invalidSubmitPayloadMissingSignature,
  invalidSubmitPayloadEmpty,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/wallet.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
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

  // ===========================================
  // Admin Middleware Tests
  // ===========================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app)
        .get("/api/wallet")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

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

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/wallet/prepare
  // ==========================================
  describe("POST /api/wallet/prepare", () => {
    it("should return 200 with payload to sign on success", async () => {
      mockPrepareWallet.mockResolvedValue(mockPrepareWalletResponse);

      const response = await request(app)
        .post("/api/wallet/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Please sign the payload to create a wallet");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBe(mockPrepareWalletResponse.payloadId);
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it("should return 400 when user has not completed KYC", async () => {
      mockPrepareWallet.mockRejectedValue(
        new CustomError(400, "User must complete KYC before creating a wallet")
      );

      const response = await request(app)
        .post("/api/wallet/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("KYC");
    });

    it("should return 400 when user already has a wallet", async () => {
      mockPrepareWallet.mockRejectedValue(
        new CustomError(400, "User already has a wallet")
      );

      const response = await request(app)
        .post("/api/wallet/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already has a wallet");
    });

    it("should pass user id to service", async () => {
      mockPrepareWallet.mockResolvedValue(mockPrepareWalletResponse);

      await request(app)
        .post("/api/wallet/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockPrepareWallet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // POST /api/wallet/submit
  // ==========================================
  describe("POST /api/wallet/submit", () => {
    describe("Validation", () => {
      it("should return 400 when payloadId is missing", async () => {
        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSubmitPayloadMissingPayloadId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Payload ID is required");
      });

      it("should return 400 when signature is missing", async () => {
        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSubmitPayloadMissingSignature);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Signature is required");
      });

      it("should return 400 when body is empty", async () => {
        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSubmitPayloadEmpty);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with wallet on success", async () => {
        mockSubmitWallet.mockResolvedValue(mockCreatedWallet);

        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Wallet created successfully");
        expect(response.body.data).toBeDefined();
      });

      it("should return 400 when user has not completed KYC", async () => {
        mockSubmitWallet.mockRejectedValue(
          new CustomError(400, "User must complete KYC before creating a wallet")
        );

        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should return 400 when user already has a wallet", async () => {
        mockSubmitWallet.mockRejectedValue(
          new CustomError(400, "User already has a wallet")
        );

        const response = await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should pass correct data to service", async () => {
        mockSubmitWallet.mockResolvedValue(mockCreatedWallet);

        await request(app)
          .post("/api/wallet/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(mockSubmitWallet).toHaveBeenCalledWith(
          mockUser.id,
          validSubmitPayload.payloadId,
          validSubmitPayload.signature
        );
      });
    });
  });

  // ==========================================
  // POST /api/wallet/accounts/prepare
  // ==========================================
  describe("POST /api/wallet/accounts/prepare", () => {
    it("should return 200 with payload to sign on success", async () => {
      mockPrepareAccount.mockResolvedValue(mockPrepareAccountResponse);

      const response = await request(app)
        .post("/api/wallet/accounts/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Please sign the payload to create an account");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.payloadId).toBeDefined();
      expect(response.body.data.payloadToSign).toBeDefined();
    });

    it("should return 404 when wallet not found", async () => {
      mockPrepareAccount.mockRejectedValue(
        new CustomError(404, "Wallet not found. Please create a wallet first.")
      );

      const response = await request(app)
        .post("/api/wallet/accounts/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Wallet not found");
    });

    it("should return 400 when wallet already has an account", async () => {
      mockPrepareAccount.mockRejectedValue(
        new CustomError(400, "Wallet already has an account")
      );

      const response = await request(app)
        .post("/api/wallet/accounts/prepare")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already has an account");
    });
  });

  // ==========================================
  // POST /api/wallet/accounts/submit
  // ==========================================
  describe("POST /api/wallet/accounts/submit", () => {
    describe("Validation", () => {
      it("should return 400 when payloadId is missing", async () => {
        const response = await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSubmitPayloadMissingPayloadId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Payload ID is required");
      });

      it("should return 400 when signature is missing", async () => {
        const response = await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSubmitPayloadMissingSignature);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Signature is required");
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with account on success", async () => {
        mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

        const response = await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Account created successfully");
        expect(response.body.data).toBeDefined();
      });

      it("should return 404 when wallet not found", async () => {
        mockSubmitAccount.mockRejectedValue(
          new CustomError(404, "Wallet not found. Please create a wallet first.")
        );

        const response = await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it("should return 400 when wallet already has an account", async () => {
        mockSubmitAccount.mockRejectedValue(
          new CustomError(400, "Wallet already has an account")
        );

        const response = await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should pass correct data to service", async () => {
        mockSubmitAccount.mockResolvedValue(mockCreatedAccount);

        await request(app)
          .post("/api/wallet/accounts/submit")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSubmitPayload);

        expect(mockSubmitAccount).toHaveBeenCalledWith(
          mockUser.id,
          validSubmitPayload.payloadId,
          validSubmitPayload.signature
        );
      });
    });
  });

  // ==========================================
  // GET /api/wallet
  // ==========================================
  describe("GET /api/wallet", () => {
    it("should return 200 with wallet on success", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Wallet retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockWalletWithAccount.id);
    });

    it("should return 404 when wallet not found", async () => {
      mockGetWallet.mockRejectedValue(
        new CustomError(404, "Wallet not found. Please create a wallet first.")
      );

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Wallet not found");
    });

    it("should pass user id to service", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGetWallet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // GET /api/wallet/transactions
  // ==========================================
  describe("GET /api/wallet/transactions", () => {
    describe("Validation", () => {
      it("should return 400 when limit is negative", async () => {
        const response = await request(app)
          .get("/api/wallet/transactions")
          .query({ limit: -5 })
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("at least 1");
      });

      it("should return 400 when limit exceeds max", async () => {
        const response = await request(app)
          .get("/api/wallet/transactions")
          .query({ limit: 150 })
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("exceed 100");
      });

      it("should return 400 when offset is negative", async () => {
        const response = await request(app)
          .get("/api/wallet/transactions")
          .query({ offset: -10 })
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("negative");
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with transactions on success", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await request(app)
          .get("/api/wallet/transactions")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Transactions retrieved successfully");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.transactions).toBeDefined();
        expect(response.body.data.total).toBe(2);
      });

      it("should return 200 with custom limit and offset", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        const response = await request(app)
          .get("/api/wallet/transactions")
          .query({ limit: 50, offset: 10 })
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(200);
        expect(mockGetTransactions).toHaveBeenCalledWith(mockUser.id, {
          limit: 50,
          offset: 10,
        });
      });

      it("should return 404 when wallet not found", async () => {
        mockGetTransactions.mockRejectedValue(
          new CustomError(404, "Wallet not found. Please create a wallet first.")
        );

        const response = await request(app)
          .get("/api/wallet/transactions")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it("should return 404 when wallet account not found", async () => {
        mockGetTransactions.mockRejectedValue(
          new CustomError(404, "Wallet account not found")
        );

        const response = await request(app)
          .get("/api/wallet/transactions")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });

      it("should use default limit and offset when not provided", async () => {
        mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

        await request(app)
          .get("/api/wallet/transactions")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

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
    it("should always return success boolean", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGetWallet.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
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

      const response = await request(app)
        .get("/api/wallet/transactions")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it("should handle wallet without account", async () => {
      mockGetWallet.mockResolvedValue(mockWalletWithoutAccount);

      const response = await request(app)
        .get("/api/wallet")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.data.account).toBeNull();
    });

    it("should handle limit as string query parameter", async () => {
      mockGetTransactions.mockResolvedValue(mockTransactionsResponse);

      const response = await request(app)
        .get("/api/wallet/transactions?limit=25")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
    });
  });
});
