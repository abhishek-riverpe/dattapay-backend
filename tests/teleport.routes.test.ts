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
  invalidPayloadMissingId,
  invalidPayloadInvalidUuid,
  invalidPayloadEmptyId,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/teleport.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

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

  // ===========================================
  // Admin Middleware Tests
  // ===========================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app)
        .get("/api/teleport")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      const response = await request(app)
        .get("/api/teleport")
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
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/teleport (Create)
  // ==========================================
  describe("POST /api/teleport", () => {
    describe("Validation", () => {
      it("should return 400 when externalAccountId is missing", async () => {
        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidPayloadMissingId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(
          "External account ID is required"
        );
      });

      it("should return 400 when externalAccountId is not a valid UUID", async () => {
        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidPayloadInvalidUuid);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid UUID");
      });

      it("should return 400 when externalAccountId is empty", async () => {
        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidPayloadEmptyId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe("Business Logic", () => {
      it("should return 400 when user does not have zynk entity", async () => {
        mockGetByClerkUserId.mockResolvedValue(mockUserWithoutZynkEntity);
        mockCreate.mockRejectedValue(
          new CustomError(400, "User must have a Zynk entity")
        );

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Zynk entity");
      });

      it("should return 400 when user does not have funding account", async () => {
        mockGetByClerkUserId.mockResolvedValue(mockUserWithoutFundingAccount);
        mockCreate.mockRejectedValue(
          new CustomError(400, "User must have a funding account")
        );

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("funding account");
      });

      it("should return 404 when external account is not found", async () => {
        mockCreate.mockRejectedValue(
          new CustomError(404, "External account not found")
        );

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("External account not found");
      });

      it("should return 400 when external account is not registered with Zynk", async () => {
        mockCreate.mockRejectedValue(
          new CustomError(400, "External account not registered with Zynk")
        );

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("not registered with Zynk");
      });

      it("should return 409 when user already has a teleport", async () => {
        mockCreate.mockRejectedValue(
          new CustomError(409, "User already has a teleport")
        );

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("already has a teleport");
      });

      it("should return 201 when teleport is created successfully", async () => {
        mockCreate.mockResolvedValue(mockCreatedTeleport);

        const response = await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Teleport created successfully");
        expect(response.body.data).toBeDefined();
        expect(response.body.data.externalAccount).toBeDefined();
      });

      it("should pass correct data to service", async () => {
        mockCreate.mockResolvedValue(mockCreatedTeleport);

        await request(app)
          .post("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validCreatePayload);

        expect(mockCreate).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            externalAccountId: validCreatePayload.externalAccountId,
          })
        );
      });
    });
  });

  // ==========================================
  // GET /api/teleport
  // ==========================================
  describe("GET /api/teleport", () => {
    it("should return 200 with teleport when found", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Teleport retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(mockTeleport.id);
    });

    it("should return 404 when teleport is not found", async () => {
      mockGet.mockRejectedValue(new CustomError(404, "Teleport not found"));

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should return 404 when user is not found in service", async () => {
      mockGet.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should pass user id to service", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGet).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ==========================================
  // PUT /api/teleport (Update)
  // ==========================================
  describe("PUT /api/teleport", () => {
    describe("Validation", () => {
      it("should return 400 when externalAccountId is missing", async () => {
        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidPayloadMissingId);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(
          "External account ID is required"
        );
      });

      it("should return 400 when externalAccountId is not a valid UUID", async () => {
        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(invalidPayloadInvalidUuid);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid UUID");
      });
    });

    describe("Business Logic", () => {
      it("should return 400 when user does not have zynk entity", async () => {
        mockUpdate.mockRejectedValue(
          new CustomError(400, "User must have a Zynk entity")
        );

        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validUpdatePayload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Zynk entity");
      });

      it("should return 404 when teleport is not found", async () => {
        mockUpdate.mockRejectedValue(
          new CustomError(404, "Teleport not found")
        );

        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validUpdatePayload);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("not found");
      });

      it("should return 404 when external account is not found", async () => {
        mockUpdate.mockRejectedValue(
          new CustomError(404, "External account not found")
        );

        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validUpdatePayload);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("External account not found");
      });

      it("should return 200 when teleport is updated successfully", async () => {
        mockUpdate.mockResolvedValue(mockUpdatedTeleport);

        const response = await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validUpdatePayload);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Teleport updated successfully");
        expect(response.body.data).toBeDefined();
      });

      it("should pass correct data to service", async () => {
        mockUpdate.mockResolvedValue(mockUpdatedTeleport);

        await request(app)
          .put("/api/teleport")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(validUpdatePayload);

        expect(mockUpdate).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            externalAccountId: validUpdatePayload.externalAccountId,
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
      mockGet.mockResolvedValue(mockTeleport);

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockGet.mockResolvedValue(mockTeleport);

      const response = await request(app)
        .get("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGet.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/teleport")
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
    it("should handle empty body gracefully on POST", async () => {
      const response = await request(app)
        .post("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle empty body gracefully on PUT", async () => {
      const response = await request(app)
        .put("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject extra fields in payload (strict validation)", async () => {
      const response = await request(app)
        .post("/api/teleport")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({
          ...validCreatePayload,
          extraField: "should be rejected",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
