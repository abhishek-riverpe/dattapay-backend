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
  mockExternalAccount,
  mockExternalAccountList,
  mockCreatedExternalAccount,
  validCreatePayload,
  invalidPayloads,
  ADMIN_TOKEN,
  AUTH_TOKEN,
  VALID_UUID,
  NON_EXISTENT_UUID,
} from "./fixtures/external-accounts.fixtures";
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
const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockList = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDelete = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/external-accounts.service", () => ({
  default: {
    create: mockCreate,
    list: mockList,
    getById: mockGetById,
    delete: mockDelete,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let externalAccountsRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  externalAccountsRoutes = (await import("../routes/external-accounts.routes")).default;
});

describe("External Accounts Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/external-accounts",
      routes: externalAccountsRoutes,
    });

    // Default mock implementations for auth
    mockVerifyToken.mockResolvedValue({ sub: "clerk_user_123" });
    mockGetByClerkUserId.mockResolvedValue(mockUser);
  });

  // Helper to create authenticated request
  function authRequest(method: "get" | "post" | "delete", endpoint: string) {
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
    endpoint: "/api/external-accounts",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockList.mockResolvedValue(mockExternalAccountList),
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Auth Middleware Tests (using shared helper)
  // ===========================================
  createAuthMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/external-accounts",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ==========================================
  // POST /api/external-accounts (Create)
  // ==========================================
  describe("POST /api/external-accounts", () => {
    describe("Validation", () => {
      it.each([
        { payload: invalidPayloads.missingAddress, message: "Wallet address is required", desc: "walletAddress is missing" },
        { payload: invalidPayloads.emptyAddress, message: undefined, desc: "walletAddress is empty" },
        { payload: invalidPayloads.longAddress, message: "Wallet address cannot exceed 255 characters", desc: "walletAddress exceeds max length" },
        { payload: { walletAddress: "0x1234567890abcdef", label: "a".repeat(101) }, message: "Label cannot exceed 100 characters", desc: "label exceeds max length" },
      ])("should return 400 when $desc", async ({ payload, message }) => {
        const response = await authRequest("post", "/api/external-accounts").send(payload);
        expectErrorResponse(response, 400, message);
      });
    });

    describe("Business Logic", () => {
      it("should return 400 when user does not have zynk entity", async () => {
        mockGetByClerkUserId.mockResolvedValue(mockUserWithoutZynkEntity);
        mockCreate.mockRejectedValue(
          new CustomError(400, "User must have a Zynk entity to add external accounts")
        );

        const response = await authRequest("post", "/api/external-accounts").send(validCreatePayload);
        expectErrorResponse(response, 400, "Zynk entity");
      });

      it("should return 409 when external account already exists", async () => {
        mockCreate.mockRejectedValue(
          new CustomError(409, "External account with this address already exists")
        );

        const response = await authRequest("post", "/api/external-accounts").send(validCreatePayload);
        expectErrorResponse(response, 409, "already exists");
      });

      it("should return 201 when external account is created successfully", async () => {
        mockCreate.mockResolvedValue(mockCreatedExternalAccount);

        const response = await authRequest("post", "/api/external-accounts").send(validCreatePayload);

        expectSuccessResponse(response, 201, "External account created successfully");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.walletAddress).toBe(validCreatePayload.walletAddress);
      });

      it("should pass correct data to service", async () => {
        mockCreate.mockResolvedValue(mockCreatedExternalAccount);

        await authRequest("post", "/api/external-accounts").send(validCreatePayload);

        expect(mockCreate).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            walletAddress: validCreatePayload.walletAddress,
            label: validCreatePayload.label,
          })
        );
      });
    });
  });

  // ==========================================
  // GET /api/external-accounts (List)
  // ==========================================
  describe("GET /api/external-accounts", () => {
    it.each([
      { mockValue: mockExternalAccountList, expectedLength: 2, desc: "list of external accounts" },
      { mockValue: [], expectedLength: 0, desc: "empty array when no accounts exist" },
    ])("should return 200 with $desc", async ({ mockValue, expectedLength }) => {
      mockList.mockResolvedValue(mockValue);

      const response = await authRequest("get", "/api/external-accounts");

      expectSuccessResponse(response, 200, expectedLength > 0 ? "External accounts retrieved successfully" : undefined);
      expect(response.body.data).toHaveLength(expectedLength);
    });

    it("should pass user id to service", async () => {
      mockList.mockResolvedValue([]);

      await authRequest("get", "/api/external-accounts");

      expect(mockList).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found in service", async () => {
      mockList.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await authRequest("get", "/api/external-accounts");
      expectErrorResponse(response, 404);
    });
  });

  // ==========================================
  // Shared tests for GET/:id and DELETE/:id
  // ==========================================
  describe.each([
    { method: "get" as const, name: "GET" },
    { method: "delete" as const, name: "DELETE" },
  ])("$name /api/external-accounts/:id - Common Validation", ({ method }) => {
    it("should return 400 when id is not a valid UUID", async () => {
      const response = await authRequest(method, "/api/external-accounts/invalid-uuid");
      expectErrorResponse(response, 400, "valid UUID");
    });

    it("should return 404 when external account is not found", async () => {
      const mockFn = method === "get" ? mockGetById : mockDelete;
      mockFn.mockRejectedValue(new CustomError(404, "External account not found"));

      const response = await authRequest(method, `/api/external-accounts/${NON_EXISTENT_UUID}`);
      expectErrorResponse(response, 404, "not found");
    });

    it("should pass correct parameters to service", async () => {
      const mockFn = method === "get" ? mockGetById : mockDelete;
      mockFn.mockResolvedValue(method === "get" ? mockExternalAccount : null);

      await authRequest(method, `/api/external-accounts/${VALID_UUID}`);

      expect(mockFn).toHaveBeenCalledWith(mockUser.id, VALID_UUID);
    });
  });

  // ==========================================
  // GET /api/external-accounts/:id (Get By ID)
  // ==========================================
  describe("GET /api/external-accounts/:id", () => {
    it("should return 200 with external account when found", async () => {
      mockGetById.mockResolvedValue(mockExternalAccount);

      const response = await authRequest("get", `/api/external-accounts/${VALID_UUID}`);

      expectSuccessResponse(response, 200, "External account retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockExternalAccount.id);
    });
  });

  // ==========================================
  // DELETE /api/external-accounts/:id
  // ==========================================
  describe("DELETE /api/external-accounts/:id", () => {
    it("should return 200 when external account is deleted successfully", async () => {
      mockDelete.mockResolvedValue(null);

      const response = await authRequest("delete", `/api/external-accounts/${VALID_UUID}`);
      expectSuccessResponse(response, 200, "External account deleted successfully");
    });

    it("should return 400 when user does not have zynk entity", async () => {
      mockDelete.mockRejectedValue(new CustomError(400, "User does not have a Zynk entity"));

      const response = await authRequest("delete", `/api/external-accounts/${VALID_UUID}`);
      expectErrorResponse(response, 400, "Zynk entity");
    });
  });

  // ===========================================
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/external-accounts",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockList.mockResolvedValue([]),
    setupErrorMock: () => mockList.mockRejectedValue(new Error("Database connection failed")),
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it.each([
      { desc: "special characters in wallet address", payload: { walletAddress: "0xABCDEF1234567890abcdef1234567890ABCDEF12", label: "Mixed Case Wallet" } },
      { desc: "optional fields being undefined", payload: { walletAddress: "0x1234567890abcdef1234567890abcdef12345678" } },
    ])("should handle $desc", async ({ payload }) => {
      mockCreate.mockResolvedValue(mockCreatedExternalAccount);

      const response = await authRequest("post", "/api/external-accounts").send(payload);
      expect(response.status).toBe(201);
    });

    it("should handle empty body gracefully", async () => {
      const response = await authRequest("post", "/api/external-accounts").send({});
      expectErrorResponse(response, 400);
    });
  });
});
