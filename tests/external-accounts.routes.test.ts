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
  invalidCreatePayloadMissingAddress,
  invalidCreatePayloadEmptyAddress,
  invalidCreatePayloadLongAddress,
  ADMIN_TOKEN,
  AUTH_TOKEN,
  VALID_UUID,
  NON_EXISTENT_UUID,
} from "./fixtures/external-accounts.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

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
  // Admin Middleware Tests
  // ===========================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app)
        .get("/api/external-accounts")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/external-accounts")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockList.mockResolvedValue(mockExternalAccountList);

      const response = await request(app)
        .get("/api/external-accounts")
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
        .get("/api/external-accounts")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/external-accounts")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .get("/api/external-accounts")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/external-accounts (Create)
  // ==========================================
  describe("POST /api/external-accounts", () => {
    describe("Validation", () => {
      it("should return 400 when walletAddress is missing", async () => {
        const response = await authRequest("post", "/api/external-accounts").send(
          invalidCreatePayloadMissingAddress
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Wallet address is required");
      });

      it("should return 400 when walletAddress is empty", async () => {
        const response = await authRequest("post", "/api/external-accounts").send(
          invalidCreatePayloadEmptyAddress
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should return 400 when walletAddress exceeds max length", async () => {
        const response = await authRequest("post", "/api/external-accounts").send(
          invalidCreatePayloadLongAddress
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(
          "Wallet address cannot exceed 255 characters"
        );
      });

      it("should return 400 when label exceeds max length", async () => {
        const response = await authRequest("post", "/api/external-accounts").send({
          walletAddress: "0x1234567890abcdef",
          label: "a".repeat(101),
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(
          "Label cannot exceed 100 characters"
        );
      });
    });

    describe("Business Logic", () => {
      it("should return 400 when user does not have zynk entity", async () => {
        mockGetByClerkUserId.mockResolvedValue(mockUserWithoutZynkEntity);
        mockCreate.mockRejectedValue(
          new CustomError(
            400,
            "User must have a Zynk entity to add external accounts"
          )
        );

        const response = await authRequest("post", "/api/external-accounts").send(
          validCreatePayload
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Zynk entity");
      });

      it("should return 409 when external account already exists", async () => {
        mockCreate.mockRejectedValue(
          new CustomError(
            409,
            "External account with this address already exists"
          )
        );

        const response = await authRequest("post", "/api/external-accounts").send(
          validCreatePayload
        );

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("already exists");
      });

      it("should return 201 when external account is created successfully", async () => {
        mockCreate.mockResolvedValue(mockCreatedExternalAccount);

        const response = await authRequest("post", "/api/external-accounts").send(
          validCreatePayload
        );

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "External account created successfully"
        );
        expect(response.body.data).toBeDefined();
        expect(response.body.data.walletAddress).toBe(
          validCreatePayload.walletAddress
        );
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
    it("should return 200 with list of external accounts", async () => {
      mockList.mockResolvedValue(mockExternalAccountList);

      const response = await authRequest("get", "/api/external-accounts");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "External accounts retrieved successfully"
      );
      expect(response.body.data).toHaveLength(2);
    });

    it("should return 200 with empty array when no accounts exist", async () => {
      mockList.mockResolvedValue([]);

      const response = await authRequest("get", "/api/external-accounts");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should pass user id to service", async () => {
      mockList.mockResolvedValue([]);

      await authRequest("get", "/api/external-accounts");

      expect(mockList).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found in service", async () => {
      mockList.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await authRequest("get", "/api/external-accounts");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // GET /api/external-accounts/:id (Get By ID)
  // ==========================================
  describe("GET /api/external-accounts/:id", () => {
    describe("Validation", () => {
      it("should return 400 when id is not a valid UUID", async () => {
        const response = await authRequest(
          "get",
          "/api/external-accounts/invalid-uuid"
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid UUID");
      });
    });

    describe("Business Logic", () => {
      it("should return 200 with external account when found", async () => {
        mockGetById.mockResolvedValue(mockExternalAccount);

        const response = await authRequest(
          "get",
          `/api/external-accounts/${VALID_UUID}`
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "External account retrieved successfully"
        );
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(mockExternalAccount.id);
      });

      it("should return 404 when external account is not found", async () => {
        mockGetById.mockRejectedValue(
          new CustomError(404, "External account not found")
        );

        const response = await authRequest(
          "get",
          `/api/external-accounts/${NON_EXISTENT_UUID}`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("not found");
      });

      it("should pass correct parameters to service", async () => {
        mockGetById.mockResolvedValue(mockExternalAccount);

        await authRequest("get", `/api/external-accounts/${VALID_UUID}`);

        expect(mockGetById).toHaveBeenCalledWith(mockUser.id, VALID_UUID);
      });
    });
  });

  // ==========================================
  // DELETE /api/external-accounts/:id
  // ==========================================
  describe("DELETE /api/external-accounts/:id", () => {
    describe("Validation", () => {
      it("should return 400 when id is not a valid UUID", async () => {
        const response = await authRequest(
          "delete",
          "/api/external-accounts/invalid-uuid"
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid UUID");
      });
    });

    describe("Business Logic", () => {
      it("should return 200 when external account is deleted successfully", async () => {
        mockDelete.mockResolvedValue(null);

        const response = await authRequest(
          "delete",
          `/api/external-accounts/${VALID_UUID}`
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe(
          "External account deleted successfully"
        );
      });

      it("should return 404 when external account is not found", async () => {
        mockDelete.mockRejectedValue(
          new CustomError(404, "External account not found")
        );

        const response = await authRequest(
          "delete",
          `/api/external-accounts/${NON_EXISTENT_UUID}`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("not found");
      });

      it("should return 400 when user does not have zynk entity", async () => {
        mockDelete.mockRejectedValue(
          new CustomError(400, "User does not have a Zynk entity")
        );

        const response = await authRequest(
          "delete",
          `/api/external-accounts/${VALID_UUID}`
        );

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Zynk entity");
      });

      it("should pass correct parameters to service", async () => {
        mockDelete.mockResolvedValue(null);

        await authRequest("delete", `/api/external-accounts/${VALID_UUID}`);

        expect(mockDelete).toHaveBeenCalledWith(mockUser.id, VALID_UUID);
      });
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      mockList.mockResolvedValue([]);

      const response = await authRequest("get", "/api/external-accounts");

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockList.mockResolvedValue([]);

      const response = await authRequest("get", "/api/external-accounts");

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockList.mockResolvedValue([]);

      const response = await authRequest("get", "/api/external-accounts");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockList.mockRejectedValue(new Error("Database connection failed"));

      const response = await authRequest("get", "/api/external-accounts");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // EDGE CASES
  // ==========================================
  describe("Edge Cases", () => {
    it("should handle special characters in wallet address", async () => {
      mockCreate.mockResolvedValue(mockCreatedExternalAccount);

      const response = await authRequest("post", "/api/external-accounts").send({
        walletAddress: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
        label: "Mixed Case Wallet",
      });

      expect(response.status).toBe(201);
    });

    it("should handle optional fields being undefined", async () => {
      mockCreate.mockResolvedValue(mockCreatedExternalAccount);

      const response = await authRequest("post", "/api/external-accounts").send({
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      });

      expect(response.status).toBe(201);
    });

    it("should handle empty body gracefully", async () => {
      const response = await authRequest("post", "/api/external-accounts").send(
        {}
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
