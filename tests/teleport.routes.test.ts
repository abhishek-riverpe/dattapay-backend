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
  mockUserWithoutFundingAccount,
  mockTeleport,
  mockCreatedTeleport,
  mockUpdatedTeleport,
  validCreatePayload,
  validUpdatePayload,
  invalidPayloads,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/teleport.fixtures";
import AppError from "../lib/AppError";
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
const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdate = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/teleport.service", () => ({
  default: {
    create: mockCreate,
    get: mockGet,
    update: mockUpdate,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let teleportRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  teleportRoutes = (await import("../routes/teleport.routes")).default;
});

describe("Teleport Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/teleport",
      routes: teleportRoutes,
    });

    // Default mock implementations for auth
    mockVerifyToken.mockResolvedValue({ sub: "clerk_user_123" });
    mockGetByClerkUserId.mockResolvedValue(mockUser);
  });

  // Helper to create authenticated request
  function authRequest(
    method: "get" | "post" | "put",
    endpoint: string,
    payload?: Record<string, unknown>
  ) {
    const req = request(app)
      [method](endpoint)
      .set("x-api-token", ADMIN_TOKEN)
      .set("x-auth-token", AUTH_TOKEN);

    return payload ? req.send(payload) : req;
  }

  // ===========================================
  // Admin Middleware Tests (using shared helper)
  // ===========================================
  createAdminMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/teleport",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Auth Middleware Tests (using shared helper)
  // ===========================================
  createAuthMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/teleport",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ==========================================
  // Shared Validation Tests (POST & PUT)
  // ==========================================
  describe.each([
    { method: "post" as const, name: "POST" },
    { method: "put" as const, name: "PUT" },
  ])("$name /api/teleport - Validation", ({ method }) => {
    it.each([
      {
        payload: invalidPayloads.missingId,
        message: "External account ID is required",
        desc: "externalAccountId is missing",
      },
      {
        payload: invalidPayloads.invalidUuid,
        message: "valid UUID",
        desc: "externalAccountId is not a valid UUID",
      },
      {
        payload: invalidPayloads.emptyId,
        message: undefined,
        desc: "externalAccountId is empty",
      },
    ])("should return 400 when $desc", async ({ payload, message }) => {
      const response = await authRequest(method, "/api/teleport", payload);
      expectErrorResponse(response, 400, message);
    });
  });

  // ==========================================
  // POST /api/teleport (Create)
  // ==========================================
  describe("POST /api/teleport", () => {
    it.each([
      {
        mockUser: mockUserWithoutZynkEntity,
        error: new AppError(400, "User must have a Zynk entity"),
        message: "Zynk entity",
        desc: "user does not have zynk entity",
      },
      {
        mockUser: mockUserWithoutFundingAccount,
        error: new AppError(400, "User must have a funding account"),
        message: "funding account",
        desc: "user does not have funding account",
      },
    ])(
      "should return 400 when $desc",
      async ({ mockUser: user, error, message }) => {
        mockGetByClerkUserId.mockResolvedValue(user);
        mockCreate.mockRejectedValue(error);

        const response = await authRequest(
          "post",
          "/api/teleport",
          validCreatePayload
        );
        expectErrorResponse(response, 400, message);
      }
    );

    it.each([
      {
        error: new AppError(404, "External account not found"),
        status: 404,
        message: "External account not found",
        desc: "external account is not found",
      },
      {
        error: new AppError(400, "External account not registered with Zynk"),
        status: 400,
        message: "not registered with Zynk",
        desc: "external account is not registered with Zynk",
      },
      {
        error: new AppError(409, "User already has a teleport"),
        status: 409,
        message: "already has a teleport",
        desc: "user already has a teleport",
      },
    ])(
      "should return $status when $desc",
      async ({ error, status, message }) => {
        mockCreate.mockRejectedValue(error);

        const response = await authRequest(
          "post",
          "/api/teleport",
          validCreatePayload
        );
        expectErrorResponse(response, status, message);
      }
    );

    it("should return 201 when teleport is created successfully", async () => {
      mockCreate.mockResolvedValue(mockCreatedTeleport);

      const response = await authRequest(
        "post",
        "/api/teleport",
        validCreatePayload
      );

      expectSuccessResponse(response, 201, "Teleport created successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.externalAccount).toBeDefined();
    });

    it("should pass correct data to service", async () => {
      mockCreate.mockResolvedValue(mockCreatedTeleport);

      await authRequest("post", "/api/teleport", validCreatePayload);
      expect(mockCreate).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          externalAccountId: validCreatePayload.externalAccountId,
        })
      );
    });
  });

  // ==========================================
  // GET /api/teleport
  // ==========================================
  describe("GET /api/teleport", () => {
    it("should return 200 with teleport when found", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      const response = await authRequest("get", "/api/teleport");

      expectSuccessResponse(response, 200, "Teleport retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockTeleport.id);
    });

    it("should return 404 when teleport is not found", async () => {
      mockGet.mockRejectedValue(new AppError(404, "Teleport not found"));

      const response = await authRequest("get", "/api/teleport");
      expectErrorResponse(response, 404, "not found");
    });

    it("should pass user id to service", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      await authRequest("get", "/api/teleport");
      expect(mockGet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // PUT /api/teleport (Update)
  // ==========================================
  describe("PUT /api/teleport", () => {
    it.each([
      {
        error: new AppError(400, "User must have a Zynk entity"),
        status: 400,
        message: "Zynk entity",
        desc: "user does not have zynk entity",
      },
      {
        error: new AppError(404, "Teleport not found"),
        status: 404,
        message: "not found",
        desc: "teleport is not found",
      },
      {
        error: new AppError(404, "External account not found"),
        status: 404,
        message: "External account not found",
        desc: "external account is not found",
      },
    ])(
      "should return $status when $desc",
      async ({ error, status, message }) => {
        mockUpdate.mockRejectedValue(error);

        const response = await authRequest(
          "put",
          "/api/teleport",
          validUpdatePayload
        );
        expectErrorResponse(response, status, message);
      }
    );

    it("should return 200 when teleport is updated successfully", async () => {
      mockUpdate.mockResolvedValue(mockUpdatedTeleport);

      const response = await authRequest(
        "put",
        "/api/teleport",
        validUpdatePayload
      );

      expectSuccessResponse(response, 200, "Teleport updated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should pass correct data to service", async () => {
      mockUpdate.mockResolvedValue(mockUpdatedTeleport);

      await authRequest("put", "/api/teleport", validUpdatePayload);
      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          externalAccountId: validUpdatePayload.externalAccountId,
        })
      );
    });
  });

  // ===========================================
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/teleport",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockGet.mockResolvedValue(mockTeleport),
    setupErrorMock: () =>
      mockGet.mockRejectedValue(new Error("Database connection failed")),
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it.each([
      { method: "post" as const, name: "POST" },
      { method: "put" as const, name: "PUT" },
    ])("should handle empty body gracefully on $name", async ({ method }) => {
      const response = await authRequest(method, "/api/teleport", {});
      expectErrorResponse(response, 400);
    });

    it("should strip extra fields in payload (security fix)", async () => {
      mockCreate.mockResolvedValue(mockCreatedTeleport);

      const response = await authRequest("post", "/api/teleport", {
        ...validCreatePayload,
        extraField: "should be stripped",
      });

      // With stripUnknown: true, extra fields are silently removed
      // This is more secure than rejecting - prevents property injection
      expectSuccessResponse(response, 201, "Teleport created successfully");
    });
  });
});
