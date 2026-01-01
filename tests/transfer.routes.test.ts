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
  mockSimulateResponse,
  mockTransferResponse,
  validSimulatePayload,
  validSimulatePayloadWithAmountOut,
  validTransferPayload,
  invalidSimulatePayloadMissingId,
  invalidSimulatePayloadInvalidUuid,
  invalidSimulatePayloadMissingAmount,
  invalidSimulatePayloadNegativeAmount,
  invalidTransferPayloadMissingExecutionId,
  invalidTransferPayloadMissingSignature,
  invalidTransferPayloadEmpty,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/transfer.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSimulateTransfer = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockTransfer = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/transfer.service", () => ({
  default: {
    simulateTransfer: mockSimulateTransfer,
    transfer: mockTransfer,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let transferRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  transferRoutes = (await import("../routes/transfer.routes")).default;
});

describe("Transfer Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/transfer",
      routes: transferRoutes,
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
        .post("/api/transfer/simulate")
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect([200, 201]).toContain(response.status);
    });
  });

  // ===========================================
  // Auth Middleware Tests
  // ===========================================
  describe("Auth Middleware", () => {
    it("should return 401 when x-auth-token header is missing", async () => {
      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validSimulatePayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token")
        .send(validSimulatePayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/transfer/simulate
  // ==========================================
  describe("POST /api/transfer/simulate", () => {
    describe("Validation", () => {
      it("should return 400 when externalAccountId is missing", async () => {
        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSimulatePayloadMissingId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("External account ID is required");
      });

      it("should return 400 when externalAccountId is not a valid UUID", async () => {
        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSimulatePayloadInvalidUuid);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid UUID");
      });

      it("should return 400 when neither exactAmountIn nor exactAmountOut is provided", async () => {
        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSimulatePayloadMissingAmount);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("exactAmountIn or exactAmountOut");
      });

      it("should return 400 when exactAmountIn is negative", async () => {
        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidSimulatePayloadNegativeAmount);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("positive");
      });

      it("should return 400 when depositMemo exceeds max length", async () => {
        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({
            ...validSimulatePayload,
            depositMemo: "a".repeat(256),
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("cannot exceed 255 characters");
      });
    });

    describe("Business Logic", () => {
      it("should return 400 when user has not completed KYC", async () => {
        mockGetByClerkUserId.mockResolvedValue(mockUserWithoutZynkEntity);
        mockSimulateTransfer.mockRejectedValue(
          new CustomError(400, "User must complete KYC before making transfers")
        );

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("KYC");
      });

      it("should return 400 when user does not have a wallet", async () => {
        mockSimulateTransfer.mockRejectedValue(
          new CustomError(400, "User does not have a wallet. Please create a wallet first.")
        );

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("wallet");
      });

      it("should return 404 when destination account is not found", async () => {
        mockSimulateTransfer.mockRejectedValue(
          new CustomError(404, "Destination external account not found")
        );

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Destination external account not found");
      });

      it("should return 400 when destination is not withdrawal type", async () => {
        mockSimulateTransfer.mockRejectedValue(
          new CustomError(400, "Destination account must be a withdrawal type external account")
        );

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("withdrawal type");
      });

      it("should return 200 with simulation result on success", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Transfer simulation successful");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.executionId).toBe(mockSimulateResponse.executionId);
        expect(response.body.data.payloadToSign).toBeDefined();
        expect(response.body.data.quote).toBeDefined();
      });

      it("should work with exactAmountOut instead of exactAmountIn", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        const response = await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayloadWithAmountOut);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it("should pass correct data to service", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        await request(app)
          .post("/api/transfer/simulate")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validSimulatePayload);

        expect(mockSimulateTransfer).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            externalAccountId: validSimulatePayload.externalAccountId,
            exactAmountIn: validSimulatePayload.exactAmountIn,
          })
        );
      });
    });
  });

  // ==========================================
  // POST /api/transfer/transfer
  // ==========================================
  describe("POST /api/transfer/transfer", () => {
    describe("Validation", () => {
      it("should return 400 when executionId is missing", async () => {
        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidTransferPayloadMissingExecutionId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Execution ID is required");
      });

      it("should return 400 when signature is missing", async () => {
        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidTransferPayloadMissingSignature);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Signature is required");
      });

      it("should return 400 when body is empty", async () => {
        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidTransferPayloadEmpty);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with transfer result on success", async () => {
        mockTransfer.mockResolvedValue(mockTransferResponse);

        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validTransferPayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(mockTransferResponse.message);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.executionId).toBe(mockTransferResponse.executionId);
      });

      it("should return 400 when execution ID is invalid", async () => {
        mockTransfer.mockRejectedValue(
          new CustomError(400, "Invalid execution ID")
        );

        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validTransferPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should return 400 when signature is invalid", async () => {
        mockTransfer.mockRejectedValue(
          new CustomError(400, "Invalid signature")
        );

        const response = await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validTransferPayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should pass correct data to service", async () => {
        mockTransfer.mockResolvedValue(mockTransferResponse);

        await request(app)
          .post("/api/transfer/transfer")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validTransferPayload);

        expect(mockTransfer).toHaveBeenCalledWith(
          expect.objectContaining({
            executionId: validTransferPayload.executionId,
            signature: validTransferPayload.signature,
          })
        );
      });
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockSimulateTransfer.mockRejectedValue(new Error("Zynk API error"));

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validSimulatePayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it("should handle both exactAmountIn and exactAmountOut in payload", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({
          ...validSimulatePayload,
          exactAmountOut: 99.5, // Both provided
        });

      expect(response.status).toBe(200);
    });

    it("should handle zero amount gracefully", async () => {
      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({
          ...validSimulatePayload,
          exactAmountIn: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle optional depositMemo being omitted", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const { depositMemo, ...payloadWithoutMemo } = validSimulatePayload;

      const response = await request(app)
        .post("/api/transfer/simulate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payloadWithoutMemo);

      expect(response.status).toBe(200);
    });
  });
});
