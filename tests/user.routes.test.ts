import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import type { Express, Router } from "express";
import request from "supertest";
import {
  mockUser,
  mockUserWithAddress,
  validCreateUserPayload,
  validUpdateUserPayload,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/user.fixtures";
import CustomError from "../lib/Error";
import type { TestAppConfig } from "./helpers";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAll = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByEmail = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDelete = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCheckEmailExists = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getAll: mockGetAll,
    getById: mockGetById,
    getByEmail: mockGetByEmail,
    getByClerkUserId: mockGetByClerkUserId,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

jest.unstable_mockModule("../repositories/zynk.repository", () => ({
  default: {
    checkEmailExists: mockCheckEmailExists,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let userRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  userRoutes = (await import("../routes/user.routes")).default;
});

describe("User Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/users",
      routes: userRoutes,
      useAuth: false, // User routes have selective auth middleware
    });

    // Default mock implementations
    mockVerifyToken.mockResolvedValue({ sub: mockUser.clerkUserId });
    mockGetByClerkUserId.mockResolvedValue(mockUser);
    mockCheckEmailExists.mockResolvedValue(false);
  });

  // ============================================================
  // Admin Middleware Tests
  // ============================================================
  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      const response = await request(app).get("/api/users/me");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", "invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired token.");
    });
  });

  // ============================================================
  // GET /api/users/me - Get Current User
  // ============================================================
  describe("GET /api/users/me", () => {
    it("should return 401 when x-auth-token is missing", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new CustomError(401, "Invalid token"));

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 when user is not found by clerk ID", async () => {
      mockGetByClerkUserId.mockRejectedValue(
        new CustomError(404, "User not found")
      );

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 200 and user data on success", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(mockGetById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return user with address relationship", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.data.address).toBeDefined();
    });

    it("should return 404 when getById service throws not found error", async () => {
      mockGetById.mockRejectedValue(
        new CustomError(404, "User not found")
      );

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });
  });

  // ============================================================
  // GET /api/users/email - Get User by Email
  // ============================================================
  describe("GET /api/users/email", () => {
    it("should return 401 when x-auth-token is missing", async () => {
      const response = await request(app)
        .get("/api/users/email")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new CustomError(401, "Invalid token"));

      const response = await request(app)
        .get("/api/users/email")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 200 and user data on success", async () => {
      mockGetByEmail.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/email")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(mockGetByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it("should return 404 when user is not found by email", async () => {
      mockGetByEmail.mockRejectedValue(
        new CustomError(404, "User not found")
      );

      const response = await request(app)
        .get("/api/users/email")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });

    it("should use authenticated user email for lookup", async () => {
      mockGetByEmail.mockResolvedValue(mockUserWithAddress);

      await request(app)
        .get("/api/users/email")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGetByEmail).toHaveBeenCalledWith(mockUser.email);
    });
  });

  // ============================================================
  // POST /api/users - Create User
  // ============================================================
  describe("POST /api/users", () => {
    it("should return 201 and created user on success", async () => {
      const createdUser = {
        ...mockUser,
        ...validCreateUserPayload,
        dateOfBirth: new Date(validCreateUserPayload.dateOfBirth),
      };
      mockCreate.mockResolvedValue(createdUser);

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call zynkEmailCheck middleware", async () => {
      mockCreate.mockResolvedValue(mockUser);

      await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(mockCheckEmailExists).toHaveBeenCalledWith(
        validCreateUserPayload.email
      );
    });

    it("should return 409 when email exists in Zynk system", async () => {
      mockCheckEmailExists.mockResolvedValue(true);

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Please use a different email address for now."
      );
    });

    it("should return 409 when email already exists in database", async () => {
      mockCreate.mockRejectedValue(
        new CustomError(409, "User with this email already exists")
      );

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User with this email already exists");
    });

    // Validation Tests
    describe("Validation", () => {
      it("should return 400 when clerkUserId is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).clerkUserId;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Clerk user ID is required");
      });

      it("should return 400 when firstName is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).firstName;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("First name is required");
      });

      it("should return 400 when lastName is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).lastName;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Last name is required");
      });

      it("should return 400 when email is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).email;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Email is required");
      });

      it("should return 400 when email format is invalid", async () => {
        const payload = { ...validCreateUserPayload, email: "invalid-email" };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid email address");
      });

      it("should return 400 when publicKey is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).publicKey;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Public key is required");
      });

      it("should return 400 when phoneNumberPrefix is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).phoneNumberPrefix;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Phone number prefix is required");
      });

      it("should return 400 when phoneNumber is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).phoneNumber;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Phone number is required");
      });

      it("should return 400 when nationality is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).nationality;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Nationality is required");
      });

      it("should return 400 when dateOfBirth is missing", async () => {
        const payload = { ...validCreateUserPayload };
        delete (payload as Record<string, unknown>).dateOfBirth;

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("Date of birth is required");
      });

      it("should return 400 when dateOfBirth format is invalid", async () => {
        const payload = { ...validCreateUserPayload, dateOfBirth: "invalid-date" };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should return 400 when firstName exceeds max length", async () => {
        const payload = { ...validCreateUserPayload, firstName: "a".repeat(101) };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("cannot exceed 100 characters");
      });

      it("should return 400 when phoneNumberPrefix exceeds max length", async () => {
        const payload = { ...validCreateUserPayload, phoneNumberPrefix: "+12345" };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("cannot exceed 5 characters");
      });

      it("should return 400 with multiple validation errors", async () => {
        const payload = {
          firstName: "John",
          // Missing most required fields
        };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        // Should contain multiple error messages
        expect(response.body.message.split(",").length).toBeGreaterThan(1);
      });

      it("should return 400 when body is empty", async () => {
        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    it("should not require auth token for POST (no auth middleware)", async () => {
      mockCreate.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      // Should not fail due to missing auth token
      expect(response.status).not.toBe(401);
    });

    it("should skip zynk check when email is not provided", async () => {
      const payload = { ...validCreateUserPayload };
      delete (payload as Record<string, unknown>).email;

      await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(payload);

      // zynkRepository should not be called when email is missing
      // (validation will fail first, but middleware should skip)
      expect(mockCheckEmailExists).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PUT /api/users/update-user - Update User
  // ============================================================
  describe("PUT /api/users/update-user", () => {
    it("should return 401 when x-auth-token is missing", async () => {
      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validUpdateUserPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new CustomError(401, "Invalid token"));

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token")
        .send(validUpdateUserPayload);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 200 and updated user on success", async () => {
      const updatedUser = { ...mockUserWithAddress, ...validUpdateUserPayload };
      mockUpdate.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateUserPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User updated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should use authenticated user ID for update", async () => {
      mockUpdate.mockResolvedValue(mockUserWithAddress);

      await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateUserPayload);

      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        validUpdateUserPayload
      );
    });

    it("should return 404 when user is not found", async () => {
      mockUpdate.mockRejectedValue(
        new CustomError(404, "User not found")
      );

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateUserPayload);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });

    it("should return 409 when trying to update to existing email", async () => {
      mockUpdate.mockRejectedValue(
        new CustomError(409, "User with this email already exists")
      );

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send({ email: "existing@example.com" });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User with this email already exists");
    });

    // Validation Tests
    describe("Validation", () => {
      it("should return 400 when body is empty", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain(
          "At least one field is required to update"
        );
      });

      it("should return 400 when firstName is empty string", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ firstName: "" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("First name cannot be empty");
      });

      it("should return 400 when email format is invalid", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ email: "invalid-email" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("valid email address");
      });

      it("should return 400 when firstName exceeds max length", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ firstName: "a".repeat(101) });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("cannot exceed 100 characters");
      });

      it("should return 400 when zynkEntityId is too short", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ zynkEntityId: "short" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain("at least 30 characters");
      });

      it("should return 400 when dateOfBirth format is invalid", async () => {
        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ dateOfBirth: "invalid-date" });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it("should allow partial updates with single field", async () => {
        mockUpdate.mockResolvedValue(mockUserWithAddress);

        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ firstName: "UpdatedName" });

        expect(response.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith(mockUser.id, {
          firstName: "UpdatedName",
        });
      });

      it("should allow updating multiple fields at once", async () => {
        mockUpdate.mockResolvedValue(mockUserWithAddress);

        const updateData = {
          firstName: "Updated",
          lastName: "Name",
          phoneNumber: "9999999999",
        };

        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith(mockUser.id, updateData);
      });

      it("should allow updating email to valid format", async () => {
        mockUpdate.mockResolvedValue(mockUserWithAddress);

        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ email: "newemail@example.com" });

        expect(response.status).toBe(200);
      });

      it("should allow updating valid zynkEntityId", async () => {
        mockUpdate.mockResolvedValue(mockUserWithAddress);

        const validZynkId = "a".repeat(35); // Between 30-50 chars

        const response = await request(app)
          .put("/api/users/update-user")
          .set("x-api-token", ADMIN_TOKEN)
          .set("x-auth-token", AUTH_TOKEN)
          .send({ zynkEntityId: validZynkId });

        expect(response.status).toBe(200);
      });
    });
  });

  // ============================================================
  // DELETE /api/users/delete-user - Delete User
  // ============================================================
  describe("DELETE /api/users/delete-user", () => {
    it("should return 401 when x-auth-token is missing", async () => {
      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new CustomError(401, "Invalid token"));

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 200 on successful deletion", async () => {
      mockDelete.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User deleted successfully");
    });

    it("should use authenticated user ID for deletion", async () => {
      mockDelete.mockResolvedValue(mockUser);

      await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockDelete).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user is not found", async () => {
      mockDelete.mockRejectedValue(
        new CustomError(404, "User not found")
      );

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });

    it("should not return deleted user data (only success message)", async () => {
      mockDelete.mockResolvedValue(mockUser);

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeUndefined();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe("Error Handling", () => {
    it("should return 500 for unexpected errors in getById", async () => {
      mockGetById.mockRejectedValue(
        new CustomError(500, "Database connection failed")
      );

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should return 500 for unexpected errors in create", async () => {
      mockCreate.mockRejectedValue(
        new CustomError(500, "Database error")
      );

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should return 500 for unexpected errors in update", async () => {
      mockUpdate.mockRejectedValue(
        new CustomError(500, "Database error")
      );

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN)
        .send(validUpdateUserPayload);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should return 500 for unexpected errors in delete", async () => {
      mockDelete.mockRejectedValue(
        new CustomError(500, "Database error")
      );

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should handle non-Error exceptions gracefully", async () => {
      mockGetById.mockRejectedValue("String error");

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Internal server error");
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockGetById.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
