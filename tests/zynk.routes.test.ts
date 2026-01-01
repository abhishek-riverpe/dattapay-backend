import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Express, Router } from "express";
import type { Response } from "supertest";
import request from "supertest";
import CustomError from "../lib/Error";
import {
  ADMIN_TOKEN,
  AUTH_TOKEN,
  mockActivatedFundingAccount,
  mockCreatedEntityResponse,
  mockCreateFundingAccountResponse,
  mockDeactivatedFundingAccount,
  mockFundingAccount,
  mockKycData,
  mockKycStatus,
  mockUser,
} from "./fixtures/zynk.fixtures";
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
const mockGetByClerkUserId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateEntity = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStartKyc = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetKycStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateFundingAccount =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetFundingAccount =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockActivateFundingAccount =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeactivateFundingAccount =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule("@clerk/express", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../services/user.service", () => ({
  default: {
    getByClerkUserId: mockGetByClerkUserId,
  },
}));

jest.unstable_mockModule("../services/zynk.service", () => ({
  default: {
    createEntity: mockCreateEntity,
    startKyc: mockStartKyc,
    getKycStatus: mockGetKycStatus,
    createFundingAccount: mockCreateFundingAccount,
    getFundingAccount: mockGetFundingAccount,
    activateFundingAccount: mockActivateFundingAccount,
    deactivateFundingAccount: mockDeactivateFundingAccount,
  },
}));

// Dynamic import after mocking
let app: Express;
let createTestApp: (config: TestAppConfig) => Express;
let zynkRoutes: Router;

beforeAll(async () => {
  const helpers = await import("./helpers");
  createTestApp = helpers.createTestApp;
  zynkRoutes = (await import("../routes/zynk.routes")).default;
});

describe("Zynk Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = createTestApp({
      basePath: "/api/zynk",
      routes: zynkRoutes,
    });

    // Default mock implementations for auth
    mockVerifyToken.mockResolvedValue({ sub: "clerk_user_123" });
    mockGetByClerkUserId.mockResolvedValue(mockUser);
  });

  // Helper to create authenticated request
  function authRequest(method: "get" | "post", endpoint: string) {
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
        .post("/api/zynk/entities")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403, "Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expectErrorResponse(response, 403);
    });

    it("should allow access with valid x-api-token", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await authRequest("post", "/api/zynk/entities");

      expect([200, 201]).toContain(response.status);
    });
  });

  // ===========================================
  // Auth Middleware Tests
  // ===========================================
  describe("Auth Middleware", () => {
    it("should return 401 when x-auth-token header is missing", async () => {
      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN);

      expectErrorResponse(response, 401, "token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expectErrorResponse(response, 401);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await authRequest("post", "/api/zynk/entities");

      expectErrorResponse(response, 401);
    });
  });

  // ===========================================
  // Common Error Scenarios (Parameterized Tests)
  // ===========================================
  describe.each([
    { method: "post" as const, endpoint: "/api/zynk/entities", mockFn: () => mockCreateEntity, name: "entities" },
    { method: "post" as const, endpoint: "/api/zynk/kyc", mockFn: () => mockStartKyc, name: "kyc" },
    { method: "get" as const, endpoint: "/api/zynk/kyc/status", mockFn: () => mockGetKycStatus, name: "kyc/status" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account", mockFn: () => mockCreateFundingAccount, name: "funding-account POST" },
    { method: "get" as const, endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ])("$name - Common Errors", ({ method, endpoint, mockFn }) => {
    it("should return 404 when user not found", async () => {
      mockFn().mockRejectedValue(new CustomError(404, "User not found"));

      const response = await authRequest(method, endpoint);

      expectErrorResponse(response, 404, "not found");
    });
  });

  describe.each([
    { method: "post" as const, endpoint: "/api/zynk/kyc", mockFn: () => mockStartKyc, name: "kyc" },
    { method: "get" as const, endpoint: "/api/zynk/kyc/status", mockFn: () => mockGetKycStatus, name: "kyc/status" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account", mockFn: () => mockCreateFundingAccount, name: "funding-account POST" },
    { method: "get" as const, endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ])("$name - No Zynk Entity", ({ method, endpoint, mockFn }) => {
    it("should return 400 when user has no Zynk entity", async () => {
      mockFn().mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await authRequest(method, endpoint);

      expectErrorResponse(response, 400, "Zynk entity");
    });
  });

  describe.each([
    { method: "get" as const, endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post" as const, endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ])("$name - No Funding Account", ({ method, endpoint, mockFn }) => {
    it("should return 400 when user has no funding account", async () => {
      mockFn().mockRejectedValue(
        new CustomError(400, "User does not have a funding account. Create funding account first.")
      );

      const response = await authRequest(method, endpoint);

      expectErrorResponse(response, 400, "funding account");
    });
  });

  // ===========================================
  // POST /api/zynk/entities Tests
  // ===========================================
  describe("POST /api/zynk/entities", () => {
    it("should return 201 on successful entity creation", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await authRequest("post", "/api/zynk/entities");

      expectSuccessResponse(response, 201, "Zynk entity created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call createEntity with correct user ID", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      await authRequest("post", "/api/zynk/entities");

      expect(mockCreateEntity).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 400 when user has no address", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(400, "User must have an address to create a Zynk entity")
      );

      const response = await authRequest("post", "/api/zynk/entities");

      expectErrorResponse(response, 400, "address");
    });

    it("should return 400 when user has no public key", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(400, "User does not have a public key")
      );

      const response = await authRequest("post", "/api/zynk/entities");

      expectErrorResponse(response, 400, "public key");
    });

    it("should return 409 when user already has a Zynk entity", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(409, "User already has a Zynk entity")
      );

      const response = await authRequest("post", "/api/zynk/entities");

      expectErrorResponse(response, 409, "already has");
    });
  });

  // ===========================================
  // POST /api/zynk/kyc Tests
  // ===========================================
  describe("POST /api/zynk/kyc", () => {
    it("should return 200 on successful KYC start", async () => {
      mockStartKyc.mockResolvedValue(mockKycData);

      const response = await authRequest("post", "/api/zynk/kyc");

      expectSuccessResponse(response, 200, "KYC started successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call startKyc with correct user ID", async () => {
      mockStartKyc.mockResolvedValue(mockKycData);

      await authRequest("post", "/api/zynk/kyc");

      expect(mockStartKyc).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ===========================================
  // GET /api/zynk/kyc/status Tests
  // ===========================================
  describe("GET /api/zynk/kyc/status", () => {
    it("should return 200 with KYC status", async () => {
      mockGetKycStatus.mockResolvedValue(mockKycStatus);

      const response = await authRequest("get", "/api/zynk/kyc/status");

      expectSuccessResponse(response, 200, "KYC status retrieved successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call getKycStatus with correct user ID", async () => {
      mockGetKycStatus.mockResolvedValue(mockKycStatus);

      await authRequest("get", "/api/zynk/kyc/status");

      expect(mockGetKycStatus).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account Tests
  // ===========================================
  describe("POST /api/zynk/funding-account", () => {
    it("should return 201 on successful funding account creation", async () => {
      mockCreateFundingAccount.mockResolvedValue(mockCreateFundingAccountResponse);

      const response = await authRequest("post", "/api/zynk/funding-account");

      expectSuccessResponse(response, 201, "Funding account created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call createFundingAccount with correct user ID", async () => {
      mockCreateFundingAccount.mockResolvedValue(mockCreateFundingAccountResponse);

      await authRequest("post", "/api/zynk/funding-account");

      expect(mockCreateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 409 when user already has a funding account", async () => {
      mockCreateFundingAccount.mockRejectedValue(
        new CustomError(409, "User already has a funding account")
      );

      const response = await authRequest("post", "/api/zynk/funding-account");

      expectErrorResponse(response, 409, "already has");
    });
  });

  // ===========================================
  // GET /api/zynk/funding-account Tests
  // ===========================================
  describe("GET /api/zynk/funding-account", () => {
    it("should return 200 with funding account data", async () => {
      mockGetFundingAccount.mockResolvedValue(mockFundingAccount);

      const response = await authRequest("get", "/api/zynk/funding-account");

      expectSuccessResponse(response, 200, "Funding account retrieved successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call getFundingAccount with correct user ID", async () => {
      mockGetFundingAccount.mockResolvedValue(mockFundingAccount);

      await authRequest("get", "/api/zynk/funding-account");

      expect(mockGetFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account/activate Tests
  // ===========================================
  describe("POST /api/zynk/funding-account/activate", () => {
    it("should return 200 on successful activation", async () => {
      mockActivateFundingAccount.mockResolvedValue(mockActivatedFundingAccount);

      const response = await authRequest("post", "/api/zynk/funding-account/activate");

      expectSuccessResponse(response, 200, "Funding account activated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call activateFundingAccount with correct user ID", async () => {
      mockActivateFundingAccount.mockResolvedValue(mockActivatedFundingAccount);

      await authRequest("post", "/api/zynk/funding-account/activate");

      expect(mockActivateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account/deactivate Tests
  // ===========================================
  describe("POST /api/zynk/funding-account/deactivate", () => {
    it("should return 200 on successful deactivation", async () => {
      mockDeactivateFundingAccount.mockResolvedValue(mockDeactivatedFundingAccount);

      const response = await authRequest("post", "/api/zynk/funding-account/deactivate");

      expectSuccessResponse(response, 200, "Funding account deactivated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call deactivateFundingAccount with correct user ID", async () => {
      mockDeactivateFundingAccount.mockResolvedValue(mockDeactivatedFundingAccount);

      await authRequest("post", "/api/zynk/funding-account/deactivate");

      expect(mockDeactivateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    beforeEach(() => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);
    });

    it("should always return success boolean and message string", async () => {
      const response = await authRequest("post", "/api/zynk/entities");

      expect(typeof response.body.success).toBe("boolean");
      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      const response = await authRequest("post", "/api/zynk/entities");

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      mockCreateEntity.mockRejectedValue(new Error("Database connection failed"));

      const response = await authRequest("post", "/api/zynk/entities");

      expectErrorResponse(response, 500);
    });
  });
});
