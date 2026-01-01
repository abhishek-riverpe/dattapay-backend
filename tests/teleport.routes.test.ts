import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";
import type { Express, Router } from "express";
import type { Response } from "supertest";
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
import CustomError from "../lib/Error";
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
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
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
  // Admin Middleware Tests
  // ===========================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app)
        .get("/api/teleport")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403, "Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403);
    });

    it("should allow access with valid x-api-token", async () => {
      const response = await authRequest("get", "/api/teleport");

      expect([200, 201]).toContain(response.status);
    });
  });

  // ===========================================
  // Auth Middleware Tests
  // ===========================================
  describe("Auth Middleware", () => {
    it("should return 401 when x-auth-token header is missing", async () => {
      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN);

      expectErrorResponse(response, 401, "token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expectErrorResponse(response, 401);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await authRequest("get", "/api/teleport");

      expectErrorResponse(response, 401);
    });
  });

  // ==========================================
  // Shared Validation Tests (POST & PUT)
  // ==========================================
  describe.each([
    { method: "post" as const, name: "POST" },
    { method: "put" as const, name: "PUT" },
  ])("$name /api/teleport - Validation", ({ method }) => {
    it("should return 400 when externalAccountId is missing", async () => {
      const response = await authRequest(method, "/api/teleport", invalidPayloads.missingId);

      expectErrorResponse(response, 400, "External account ID is required");
    });

    it("should return 400 when externalAccountId is not a valid UUID", async () => {
      const response = await authRequest(method, "/api/teleport", invalidPayloads.invalidUuid);

      expectErrorResponse(response, 400, "valid UUID");
    });

    it("should return 400 when externalAccountId is empty", async () => {
      const response = await authRequest(method, "/api/teleport", invalidPayloads.emptyId);

      expectErrorResponse(response, 400);
    });
  });

  // ==========================================
  // POST /api/teleport (Create)
  // ==========================================
  describe("POST /api/teleport", () => {
    it("should return 400 when user does not have zynk entity", async () => {
      mockGetByClerkUserId.mockResolvedValue(mockUserWithoutZynkEntity);
      mockCreate.mockRejectedValue(
        new CustomError(400, "User must have a Zynk entity")
      );

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

      expectErrorResponse(response, 400, "Zynk entity");
    });

    it("should return 400 when user does not have funding account", async () => {
      mockGetByClerkUserId.mockResolvedValue(mockUserWithoutFundingAccount);
      mockCreate.mockRejectedValue(
        new CustomError(400, "User must have a funding account")
      );

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

      expectErrorResponse(response, 400, "funding account");
    });

    it("should return 404 when external account is not found", async () => {
      mockCreate.mockRejectedValue(
        new CustomError(404, "External account not found")
      );

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

      expectErrorResponse(response, 404, "External account not found");
    });

    it("should return 400 when external account is not registered with Zynk", async () => {
      mockCreate.mockRejectedValue(
        new CustomError(400, "External account not registered with Zynk")
      );

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

      expectErrorResponse(response, 400, "not registered with Zynk");
    });

    it("should return 409 when user already has a teleport", async () => {
      mockCreate.mockRejectedValue(
        new CustomError(409, "User already has a teleport")
      );

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

      expectErrorResponse(response, 409, "already has a teleport");
    });

    it("should return 201 when teleport is created successfully", async () => {
      mockCreate.mockResolvedValue(mockCreatedTeleport);

      const response = await authRequest("post", "/api/teleport", validCreatePayload);

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
      mockGet.mockRejectedValue(new CustomError(404, "Teleport not found"));

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
    it("should return 400 when user does not have zynk entity", async () => {
      mockUpdate.mockRejectedValue(
        new CustomError(400, "User must have a Zynk entity")
      );

      const response = await authRequest("put", "/api/teleport", validUpdatePayload);

      expectErrorResponse(response, 400, "Zynk entity");
    });

    it("should return 404 when teleport is not found", async () => {
      mockUpdate.mockRejectedValue(new CustomError(404, "Teleport not found"));

      const response = await authRequest("put", "/api/teleport", validUpdatePayload);

      expectErrorResponse(response, 404, "not found");
    });

    it("should return 404 when external account is not found", async () => {
      mockUpdate.mockRejectedValue(
        new CustomError(404, "External account not found")
      );

      const response = await authRequest("put", "/api/teleport", validUpdatePayload);

      expectErrorResponse(response, 404, "External account not found");
    });

    it("should return 200 when teleport is updated successfully", async () => {
      mockUpdate.mockResolvedValue(mockUpdatedTeleport);

      const response = await authRequest("put", "/api/teleport", validUpdatePayload);

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
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    beforeEach(() => {
      mockGet.mockResolvedValue(mockTeleport);
    });

    it("should always return success boolean and message string", async () => {
      const response = await authRequest("get", "/api/teleport");

      expect(typeof response.body.success).toBe("boolean");
      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      const response = await authRequest("get", "/api/teleport");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGet.mockRejectedValue(new Error("Database connection failed"));

      const response = await authRequest("get", "/api/teleport");

      expectErrorResponse(response, 500);
    });
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

    it("should reject extra fields in payload (strict validation)", async () => {
      const response = await authRequest("post", "/api/teleport", {
        ...validCreatePayload,
        extraField: "should be rejected",
      });

      expectErrorResponse(response, 400);
    });
  });
});
