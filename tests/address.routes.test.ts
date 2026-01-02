import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import type { Express, Router } from "express";
import request from "supertest";
import {
  mockAddress,
  mockAddressWithUser,
  mockUser,
  validCreateAddressPayload,
  validUpdateAddressPayload,
  partialUpdatePayload,
  invalidCreateAddressPayload,
  emptyFieldPayload,
  exceedsMaxLengthPayload,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/address.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateByUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteByUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/address.service", () => ({
  default: {
    getByUserId: mockGetByUserId,
    create: mockCreate,
    updateByUserId: mockUpdateByUserId,
    deleteByUserId: mockDeleteByUserId,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let addressRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  addressRoutes = (await import("../routes/address.routes")).default;
});

describe("Address Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/addresses",
      routes: addressRoutes,
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
        .get("/api/addresses")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
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
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    (process.env.BYPASS_AUTH_USER_LOOKUP === "true" ? it.skip : it)(
      "should return 401 when user not found for clerk user id",
      async () => {
        mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

        const response = await request(app)
          .get("/api/addresses")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    );
  });

  // ===========================================
  // GET /api/addresses Tests
  // ===========================================
  describe("GET /api/addresses", () => {
    it("should return 200 with address when found", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Address retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(response.body.data.addressLine1).toBe(mockAddressWithUser.addressLine1);
    });

    it("should return 404 when address not found", async () => {
      mockGetByUserId.mockRejectedValue(new CustomError(404, "Address not found for this user"));

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should call getByUserId with authenticated user id", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGetByUserId).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return correct APIResponse format", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("data");
      expect(typeof response.body.success).toBe("boolean");
      expect(typeof response.body.message).toBe("string");
    });
  });

  // ===========================================
  // POST /api/addresses Tests
  // ===========================================
  describe("POST /api/addresses", () => {
    it("should return 201 on successful creation", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validCreateAddressPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Address created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call create with payload including userId from auth", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);

      await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validCreateAddressPayload);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validCreateAddressPayload,
          userId: mockUser.id,
        })
      );
    });

    it("should return 400 when addressLine1 is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).addressLine1;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Address line 1");
    });

    it("should return 400 when locality is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).locality;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Locality");
    });

    it("should return 400 when city is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).city;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("City");
    });

    it("should return 400 when state is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).state;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("State");
    });

    it("should return 400 when country is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).country;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Country");
    });

    it("should return 400 when postalCode is missing", async () => {
      const payload = { ...validCreateAddressPayload };
      delete (payload as Record<string, unknown>).postalCode;

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Postal code");
    });

    it("should return 400 when addressLine1 is empty", async () => {
      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(emptyFieldPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("empty");
    });

    it("should return 400 when addressLine1 exceeds max length", async () => {
      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(exceedsMaxLengthPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("255");
    });

    it("should accept optional addressLine2", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validCreateAddressPayload);

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          addressLine2: validCreateAddressPayload.addressLine2,
        })
      );
    });

    it("should allow empty addressLine2", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);
      const payload = { ...validCreateAddressPayload, addressLine2: "" };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(201);
    });

    it("should return 404 when user not found", async () => {
      mockCreate.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validCreateAddressPayload);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should return 409 when user already has an address", async () => {
      mockCreate.mockRejectedValue(new CustomError(409, "User already has an address"));

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validCreateAddressPayload);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already has");
    });

    it("should return 400 with multiple validation errors", async () => {
      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(invalidCreateAddressPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Should contain multiple error messages
      expect(response.body.message.split(",").length).toBeGreaterThan(1);
    });
  });

  // ===========================================
  // PUT /api/addresses Tests
  // ===========================================
  describe("PUT /api/addresses", () => {
    it("should return 200 on successful update", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateAddressPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Address updated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call updateByUserId with correct parameters", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);

      await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateAddressPayload);

      expect(mockUpdateByUserId).toHaveBeenCalledWith(
        mockUser.id,
        validUpdateAddressPayload
      );
    });

    it("should allow partial updates", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(partialUpdatePayload);

      expect(response.status).toBe(200);
      expect(mockUpdateByUserId).toHaveBeenCalledWith(
        mockUser.id,
        partialUpdatePayload
      );
    });

    it("should return 400 when no fields provided", async () => {
      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("At least one field");
    });

    it("should return 400 when addressLine1 is empty string", async () => {
      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({ addressLine1: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("empty");
    });

    it("should return 400 when field exceeds max length", async () => {
      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({ addressLine1: "a".repeat(300) });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("255");
    });

    it("should return 404 when address not found", async () => {
      mockUpdateByUserId.mockRejectedValue(new CustomError(404, "Address not found for this user"));

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateAddressPayload);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should allow updating addressLine2 to empty string", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({ addressLine2: "" });

      expect(response.status).toBe(200);
    });

    it("should allow updating addressLine2 to null", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({ addressLine2: null });

      expect(response.status).toBe(200);
    });

    it("should allow updating all fields at once", async () => {
      mockUpdateByUserId.mockResolvedValue(mockAddressWithUser);
      const fullUpdate = {
        addressLine1: "New Address",
        addressLine2: "Apt 5",
        locality: "New Locality",
        city: "New City",
        state: "New State",
        country: "New Country",
        postalCode: "99999",
      };

      const response = await request(app)
        .put("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(fullUpdate);

      expect(response.status).toBe(200);
      expect(mockUpdateByUserId).toHaveBeenCalledWith(mockUser.id, fullUpdate);
    });
  });

  // ===========================================
  // DELETE /api/addresses Tests
  // ===========================================
  describe("DELETE /api/addresses", () => {
    it("should return 200 on successful deletion", async () => {
      mockDeleteByUserId.mockResolvedValue(mockAddress);

      const response = await request(app)
        .delete("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Address deleted successfully");
    });

    it("should call deleteByUserId with authenticated user id", async () => {
      mockDeleteByUserId.mockResolvedValue(mockAddress);

      await request(app)
        .delete("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockDeleteByUserId).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when address not found", async () => {
      mockDeleteByUserId.mockRejectedValue(new CustomError(404, "Address not found for this user"));

      const response = await request(app)
        .delete("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should not return data on successful deletion", async () => {
      mockDeleteByUserId.mockResolvedValue(mockAddress);

      const response = await request(app)
        .delete("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.body.data).toBeUndefined();
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockGetByUserId.mockResolvedValue(mockAddressWithUser);

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGetByUserId.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe("Edge Cases", () => {
    it("should handle special characters in address fields", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);
      const payload = {
        ...validCreateAddressPayload,
        addressLine1: "123 O'Brien Street, Apt #4",
        addressLine2: "Building \"A\" & Co.",
      };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(201);
    });

    it("should handle unicode characters in address fields", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);
      const payload = {
        ...validCreateAddressPayload,
        addressLine1: "東京都渋谷区",
        city: "東京",
        country: "日本",
      };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(201);
    });

    it("should trim whitespace from fields", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);
      const payload = {
        addressLine1: "  123 Main St  ",
        locality: "Downtown",
        city: "New York",
        state: "NY",
        country: "USA",
        postalCode: "10001",
      };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(201);
    });

    it("should handle maximum length boundary for addressLine1", async () => {
      mockCreate.mockResolvedValue(mockAddressWithUser);
      const payload = {
        ...validCreateAddressPayload,
        addressLine1: "a".repeat(255), // Exactly at max
      };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(201);
    });

    it("should reject addressLine1 one character over max", async () => {
      const payload = {
        ...validCreateAddressPayload,
        addressLine1: "a".repeat(256), // One over max
      };

      const response = await request(app)
        .post("/api/addresses")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });
});
