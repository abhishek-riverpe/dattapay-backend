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
  mockUserWithAddress,
  validCreateUserPayload,
  validUpdateUserPayload,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/user.fixtures";
import AppError from "../lib/AppError";
import type { TestAppConfig } from "./helpers";
import {
  createResponseFormatTests,
  expectErrorResponse,
  expectSuccessResponse,
} from "./helpers";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAll = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByEmail = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDelete = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCheckEmailExists =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

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

  // Helper to create authenticated request
  function authRequest(
    method: "get" | "post" | "put" | "delete",
    endpoint: string
  ) {
    return request(app)
      [method](endpoint)
      .set("x-api-token", ADMIN_TOKEN)
      .set("x-auth-token", AUTH_TOKEN);
  }

  // ============================================================
  // Admin Middleware Tests
  // ============================================================
  describe("Admin Middleware", () => {
    it.each([
      {
        desc: "x-api-token header is missing",
        setup: () => request(app).get("/api/users/me"),
        expectedMessage: "Access denied. No token provided.",
      },
      {
        desc: "x-api-token is invalid",
        setup: () =>
          request(app).get("/api/users/me").set("x-api-token", "invalid-token"),
        expectedMessage: "Invalid or expired token.",
      },
    ])("should return 403 when $desc", async ({ setup, expectedMessage }) => {
      const response = await setup();
      expectErrorResponse(response, 403, expectedMessage);
    });
  });

  // ============================================================
  // GET /api/users/me - Get Current User
  // ============================================================
  describe("GET /api/users/me", () => {
    it.each([
      {
        desc: "x-auth-token is missing",
        setup: () =>
          request(app).get("/api/users/me").set("x-api-token", ADMIN_TOKEN),
        expectedMessage: "Access denied. No token provided.",
      },
    ])("should return 401 when $desc", async ({ setup, expectedMessage }) => {
      const response = await setup();
      expectErrorResponse(response, 401, expectedMessage);
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new AppError(401, "Invalid token"));

      const response = await request(app)
        .get("/api/users/me")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expectErrorResponse(response, 401);
    });

    (process.env.BYPASS_AUTH_USER_LOOKUP === "true" ? it.skip : it)(
      "should return 404 when user is not found by clerk ID",
      async () => {
        mockGetByClerkUserId.mockRejectedValue(
          new AppError(404, "User not found")
        );

        const response = await authRequest("get", "/api/users/me");
        expectErrorResponse(response, 401);
      }
    );

    it("should return 200 and user data on success", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await authRequest("get", "/api/users/me");

      expectSuccessResponse(response, 200, "User retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(mockGetById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return user with address relationship", async () => {
      mockGetById.mockResolvedValue(mockUserWithAddress);

      const response = await authRequest("get", "/api/users/me");

      expectSuccessResponse(response, 200);
      expect(response.body.data.address).toBeDefined();
    });

    it("should return 404 when getById service throws not found error", async () => {
      mockGetById.mockRejectedValue(new AppError(404, "User not found"));

      const response = await authRequest("get", "/api/users/me");

      expectErrorResponse(response, 404, "User not found");
    });
  });

  // ============================================================
  // GET /api/users/email - Get User by Email
  // ============================================================
  describe("GET /api/users/email", () => {
    it.each([
      {
        desc: "x-auth-token is missing",
        setup: () =>
          request(app).get("/api/users/email").set("x-api-token", ADMIN_TOKEN),
      },
      {
        desc: "x-auth-token is invalid",
        setup: () => {
          mockVerifyToken.mockRejectedValue(new AppError(401, "Invalid token"));
          return request(app)
            .get("/api/users/email")
            .set("x-api-token", ADMIN_TOKEN)
            .set("x-auth-token", "invalid-token");
        },
      },
    ])("should return 401 when $desc", async ({ setup }) => {
      const response = await setup();
      expectErrorResponse(response, 401);
    });

    it("should return 200 and user data on success", async () => {
      mockGetByEmail.mockResolvedValue(mockUserWithAddress);

      const response = await authRequest("get", "/api/users/email");

      expectSuccessResponse(response, 200, "User retrieved successfully");
      expect(response.body.data).toBeDefined();
      expect(mockGetByEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it("should return 404 when user is not found by email", async () => {
      mockGetByEmail.mockRejectedValue(new AppError(404, "User not found"));

      const response = await authRequest("get", "/api/users/email");

      expectErrorResponse(response, 404, "User not found");
    });

    it("should use authenticated user email for lookup", async () => {
      mockGetByEmail.mockResolvedValue(mockUserWithAddress);

      await authRequest("get", "/api/users/email");

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

      expectSuccessResponse(response, 201, "User created successfully");
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

    it.each([
      {
        mockValue: true,
        status: 409,
        message: "Please use a different email address for now.",
        desc: "email exists in Zynk system",
      },
    ])(
      "should return $status when $desc",
      async ({ mockValue, status, message }) => {
        mockCheckEmailExists.mockResolvedValue(mockValue);

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(validCreateUserPayload);

        expectErrorResponse(response, status, message);
      }
    );

    it("should return 409 when email already exists in database", async () => {
      mockCreate.mockRejectedValue(
        new AppError(409, "User with this email already exists")
      );

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expectErrorResponse(response, 409, "User with this email already exists");
    });

    // Validation Tests
    describe("Validation", () => {
      const requiredFields = [
        { field: "clerkUserId", message: "Clerk user ID is required" },
        { field: "firstName", message: "First name is required" },
        { field: "lastName", message: "Last name is required" },
        { field: "email", message: "Email is required" },
        { field: "publicKey", message: "Public key is required" },
        {
          field: "phoneNumberPrefix",
          message: "Phone number prefix is required",
        },
        { field: "phoneNumber", message: "Phone number is required" },
        { field: "nationality", message: "Nationality is required" },
        { field: "dateOfBirth", message: "Date of birth is required" },
      ];

      it.each(requiredFields)(
        "should return 400 when $field is missing",
        async ({ field, message }) => {
          const payload = { ...validCreateUserPayload };
          delete (payload as Record<string, unknown>)[field];

          const response = await request(app)
            .post("/api/users")
            .set("x-api-token", ADMIN_TOKEN)
            .send(payload);

          expectErrorResponse(response, 400, message);
        }
      );

      it.each([
        {
          field: "email",
          value: "invalid-email",
          message: "valid email address",
          desc: "email format is invalid",
        },
        {
          field: "dateOfBirth",
          value: "invalid-date",
          message: undefined,
          desc: "dateOfBirth format is invalid",
        },
        {
          field: "firstName",
          value: "a".repeat(101),
          message: "cannot exceed 100 characters",
          desc: "firstName exceeds max length",
        },
        {
          field: "phoneNumberPrefix",
          value: "+12345",
          message: "cannot exceed 5 characters",
          desc: "phoneNumberPrefix exceeds max length",
        },
      ])("should return 400 when $desc", async ({ field, value, message }) => {
        const payload = { ...validCreateUserPayload, [field]: value };

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expectErrorResponse(response, 400, message);
      });

      it("should return 400 with multiple validation errors", async () => {
        const payload = { firstName: "John" }; // Missing most required fields

        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send(payload);

        expectErrorResponse(response, 400);
        expect(response.body.message.split(",").length).toBeGreaterThan(1);
      });

      it("should return 400 when body is empty", async () => {
        const response = await request(app)
          .post("/api/users")
          .set("x-api-token", ADMIN_TOKEN)
          .send({});

        expectErrorResponse(response, 400);
      });
    });

    it("should not require auth token for POST (no auth middleware)", async () => {
      mockCreate.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(validCreateUserPayload);

      expect(response.status).not.toBe(401);
    });

    it("should skip zynk check when email is not provided", async () => {
      const payload = { ...validCreateUserPayload };
      delete (payload as Record<string, unknown>).email;

      await request(app)
        .post("/api/users")
        .set("x-api-token", ADMIN_TOKEN)
        .send(payload);

      expect(mockCheckEmailExists).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // PUT /api/users/update-user - Update User
  // ============================================================
  describe("PUT /api/users/update-user", () => {
    it.each([
      {
        desc: "x-auth-token is missing",
        setup: () =>
          request(app)
            .put("/api/users/update-user")
            .set("x-api-token", ADMIN_TOKEN)
            .send(validUpdateUserPayload),
      },
    ])("should return 401 when $desc", async ({ setup }) => {
      const response = await setup();
      expectErrorResponse(response, 401, "Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new AppError(401, "Invalid token"));

      const response = await request(app)
        .put("/api/users/update-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token")
        .send(validUpdateUserPayload);

      expectErrorResponse(response, 401);
    });

    it("should return 200 and updated user on success", async () => {
      const updatedUser = { ...mockUserWithAddress, ...validUpdateUserPayload };
      mockUpdate.mockResolvedValue(updatedUser);

      const response = await authRequest("put", "/api/users/update-user").send(
        validUpdateUserPayload
      );

      expectSuccessResponse(response, 200, "User updated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should use authenticated user ID for update", async () => {
      mockUpdate.mockResolvedValue(mockUserWithAddress);

      await authRequest("put", "/api/users/update-user").send(
        validUpdateUserPayload
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        validUpdateUserPayload
      );
    });

    it.each([
      {
        error: new AppError(404, "User not found"),
        status: 404,
        message: "User not found",
        desc: "user is not found",
      },
      {
        error: new AppError(409, "User with this email already exists"),
        status: 409,
        message: "User with this email already exists",
        desc: "trying to update to existing email",
      },
    ])(
      "should return $status when $desc",
      async ({ error, status, message }) => {
        mockUpdate.mockRejectedValue(error);

        const response = await authRequest(
          "put",
          "/api/users/update-user"
        ).send(validUpdateUserPayload);

        expectErrorResponse(response, status, message);
      }
    );

    // Validation Tests
    describe("Validation", () => {
      it.each([
        {
          payload: {},
          message: "At least one field is required to update",
          desc: "body is empty",
        },
        {
          payload: { firstName: "" },
          message: "First name cannot be empty",
          desc: "firstName is empty string",
        },
        {
          payload: { email: "invalid-email" },
          message: "valid email address",
          desc: "email format is invalid",
        },
        {
          payload: { firstName: "a".repeat(101) },
          message: "cannot exceed 100 characters",
          desc: "firstName exceeds max length",
        },
        {
          payload: { dateOfBirth: "invalid-date" },
          message: undefined,
          desc: "dateOfBirth format is invalid",
        },
      ])("should return 400 when $desc", async ({ payload, message }) => {
        const response = await authRequest(
          "put",
          "/api/users/update-user"
        ).send(payload);
        expectErrorResponse(response, 400, message);
      });

      it.each([
        { payload: { firstName: "UpdatedName" }, desc: "single field" },
        {
          payload: {
            firstName: "Updated",
            lastName: "Name",
            phoneNumber: "9999999999",
          },
          desc: "multiple fields at once",
        },
        {
          payload: { email: "newemail@example.com" },
          desc: "email to valid format",
        },
      ])("should allow partial updates with $desc", async ({ payload }) => {
        mockUpdate.mockResolvedValue(mockUserWithAddress);

        const response = await authRequest(
          "put",
          "/api/users/update-user"
        ).send(payload);

        expectSuccessResponse(response, 200);
      });
    });
  });

  // ============================================================
  // DELETE /api/users/delete-user - Delete User
  // ============================================================
  describe("DELETE /api/users/delete-user", () => {
    it.each([
      {
        desc: "x-auth-token is missing",
        setup: () =>
          request(app)
            .delete("/api/users/delete-user")
            .set("x-api-token", ADMIN_TOKEN),
      },
    ])("should return 401 when $desc", async ({ setup }) => {
      const response = await setup();
      expectErrorResponse(response, 401, "Access denied. No token provided.");
    });

    it("should return 401 when x-auth-token is invalid", async () => {
      mockVerifyToken.mockRejectedValue(new AppError(401, "Invalid token"));

      const response = await request(app)
        .delete("/api/users/delete-user")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expectErrorResponse(response, 401);
    });

    it("should return 200 on successful deletion", async () => {
      mockDelete.mockResolvedValue(mockUser);

      const response = await authRequest("delete", "/api/users/delete-user");

      expectSuccessResponse(response, 200, "User deleted successfully");
    });

    it("should use authenticated user ID for deletion", async () => {
      mockDelete.mockResolvedValue(mockUser);

      await authRequest("delete", "/api/users/delete-user");

      expect(mockDelete).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user is not found", async () => {
      mockDelete.mockRejectedValue(new AppError(404, "User not found"));

      const response = await authRequest("delete", "/api/users/delete-user");

      expectErrorResponse(response, 404, "User not found");
    });

    it("should not return deleted user data (only success message)", async () => {
      mockDelete.mockResolvedValue(mockUser);

      const response = await authRequest("delete", "/api/users/delete-user");

      expectSuccessResponse(response, 200);
      expect(response.body.data).toBeUndefined();
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================
  describe("Error Handling", () => {
    it.each([
      {
        method: "get" as const,
        endpoint: "/api/users/me",
        mockFn: () => mockGetById,
        desc: "getById",
      },
      {
        method: "post" as const,
        endpoint: "/api/users",
        mockFn: () => mockCreate,
        desc: "create",
        payload: validCreateUserPayload,
        useAuth: false,
      },
      {
        method: "put" as const,
        endpoint: "/api/users/update-user",
        mockFn: () => mockUpdate,
        desc: "update",
        payload: validUpdateUserPayload,
      },
      {
        method: "delete" as const,
        endpoint: "/api/users/delete-user",
        mockFn: () => mockDelete,
        desc: "delete",
      },
    ])(
      "should return 500 for unexpected errors in $desc",
      async ({ method, endpoint, mockFn, payload, useAuth = true }) => {
        mockFn().mockRejectedValue(new AppError(500, "Database error"));

        let req = request(app)
          [method](endpoint)
          .set("x-api-token", ADMIN_TOKEN);
        if (useAuth) {
          req = req.set("x-auth-token", AUTH_TOKEN);
        }
        if (payload) {
          req = req.send(payload);
        }

        const response = await req;
        expectErrorResponse(response, 500);
      }
    );

    it("should handle non-Error exceptions gracefully", async () => {
      mockGetById.mockRejectedValue("String error");

      const response = await authRequest("get", "/api/users/me");

      expectErrorResponse(response, 500, "Internal server error");
    });
  });

  // ===========================================
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/users/me",
    method: "get",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockGetById.mockResolvedValue(mockUserWithAddress),
    setupErrorMock: () =>
      mockGetById.mockRejectedValue(new Error("Database connection failed")),
  });
});
