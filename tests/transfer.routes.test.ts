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
  invalidSimulatePayloads,
  invalidTransferPayloads,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/transfer.fixtures";
import CustomError from "../lib/Error";
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

  // Helper to create authenticated request
  function authRequest(method: "post", endpoint: string) {
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
    endpoint: "/api/transfer/simulate",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockSimulateTransfer.mockResolvedValue(mockSimulateResponse),
    payload: validSimulatePayload,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Auth Middleware Tests (using shared helper)
  // ===========================================
  createAuthMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/transfer/simulate",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    payload: validSimulatePayload,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ==========================================
  // POST /api/transfer/simulate
  // ==========================================
  describe("POST /api/transfer/simulate", () => {
    describe("Validation", () => {
      it.each([
        { payload: invalidSimulatePayloads.missingId, message: "External account ID is required", desc: "externalAccountId is missing" },
        { payload: invalidSimulatePayloads.invalidUuid, message: "valid UUID", desc: "externalAccountId is not a valid UUID" },
        { payload: invalidSimulatePayloads.missingAmount, message: "exactAmountIn or exactAmountOut", desc: "neither exactAmountIn nor exactAmountOut is provided" },
        { payload: invalidSimulatePayloads.negativeAmount, message: "positive", desc: "exactAmountIn is negative" },
        { payload: { ...validSimulatePayload, depositMemo: "a".repeat(256) }, message: "cannot exceed 255 characters", desc: "depositMemo exceeds max length" },
      ])("should return 400 when $desc", async ({ payload, message }) => {
        const response = await authRequest("post", "/api/transfer/simulate").send(payload);
        expectErrorResponse(response, 400, message);
      });
    });

    describe("Business Logic", () => {
      it.each([
        { error: new CustomError(400, "User must complete KYC before making transfers"), message: "KYC", mockUser: mockUserWithoutZynkEntity, desc: "user has not completed KYC" },
        { error: new CustomError(400, "User does not have a wallet. Please create a wallet first."), message: "wallet", mockUser: mockUser, desc: "user does not have a wallet" },
        { error: new CustomError(404, "Destination external account not found"), message: "Destination external account not found", mockUser: mockUser, desc: "destination account is not found" },
        { error: new CustomError(400, "Destination account must be a withdrawal type external account"), message: "withdrawal type", mockUser: mockUser, desc: "destination is not withdrawal type" },
      ])("should return appropriate error when $desc", async ({ error, message, mockUser: user }) => {
        mockGetByClerkUserId.mockResolvedValue(user);
        mockSimulateTransfer.mockRejectedValue(error);

        const response = await authRequest("post", "/api/transfer/simulate").send(validSimulatePayload);
        expectErrorResponse(response, error.status, message);
      });

      it("should return 200 with simulation result on success", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        const response = await authRequest("post", "/api/transfer/simulate").send(validSimulatePayload);

        expectSuccessResponse(response, 200, "Transfer simulation successful");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.executionId).toBe(mockSimulateResponse.executionId);
        expect(response.body.data.payloadToSign).toBeDefined();
        expect(response.body.data.quote).toBeDefined();
      });

      it("should work with exactAmountOut instead of exactAmountIn", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        const response = await authRequest("post", "/api/transfer/simulate").send(validSimulatePayloadWithAmountOut);

        expectSuccessResponse(response, 200);
      });

      it("should pass correct data to service", async () => {
        mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

        await authRequest("post", "/api/transfer/simulate").send(validSimulatePayload);

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
      it.each([
        { payload: invalidTransferPayloads.missingExecutionId, message: "Execution ID is required", desc: "executionId is missing" },
        { payload: invalidTransferPayloads.missingSignature, message: "Signature is required", desc: "signature is missing" },
        { payload: invalidTransferPayloads.empty, message: undefined, desc: "body is empty" },
      ])("should return 400 when $desc", async ({ payload, message }) => {
        const response = await authRequest("post", "/api/transfer/transfer").send(payload);
        expectErrorResponse(response, 400, message);
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with transfer result on success", async () => {
        mockTransfer.mockResolvedValue(mockTransferResponse);

        const response = await authRequest("post", "/api/transfer/transfer").send(validTransferPayload);

        expectSuccessResponse(response, 200, mockTransferResponse.message);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.executionId).toBe(mockTransferResponse.executionId);
      });

      it.each([
        { error: new CustomError(400, "Invalid execution ID"), desc: "execution ID is invalid" },
        { error: new CustomError(400, "Invalid signature"), desc: "signature is invalid" },
      ])("should return 400 when $desc", async ({ error }) => {
        mockTransfer.mockRejectedValue(error);

        const response = await authRequest("post", "/api/transfer/transfer").send(validTransferPayload);
        expectErrorResponse(response, 400);
      });

      it("should pass correct data to service", async () => {
        mockTransfer.mockResolvedValue(mockTransferResponse);

        await authRequest("post", "/api/transfer/transfer").send(validTransferPayload);

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
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/transfer/simulate",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    payload: validSimulatePayload,
    setupSuccessMock: () => mockSimulateTransfer.mockResolvedValue(mockSimulateResponse),
    setupErrorMock: () => mockSimulateTransfer.mockRejectedValue(new Error("Zynk API error")),
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it("should handle both exactAmountIn and exactAmountOut in payload", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const response = await authRequest("post", "/api/transfer/simulate").send({
        ...validSimulatePayload,
        exactAmountOut: 99.5, // Both provided
      });

      expectSuccessResponse(response, 200);
    });

    it("should handle zero amount gracefully", async () => {
      const response = await authRequest("post", "/api/transfer/simulate").send({
        ...validSimulatePayload,
        exactAmountIn: 0,
      });

      expectErrorResponse(response, 400);
    });

    it("should handle optional depositMemo being omitted", async () => {
      mockSimulateTransfer.mockResolvedValue(mockSimulateResponse);

      const { depositMemo, ...payloadWithoutMemo } = validSimulatePayload;

      const response = await authRequest("post", "/api/transfer/simulate").send(payloadWithoutMemo);

      expectSuccessResponse(response, 200);
    });
  });
});
