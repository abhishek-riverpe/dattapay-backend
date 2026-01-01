import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import type { Express } from "express";
import request from "supertest";
import {
  mockUser,
  mockUserWithZynkEntity,
  mockUserWithFundingAccount,
  mockCreatedEntityResponse,
  mockKycData,
  mockKycStatus,
  mockFundingAccount,
  mockCreateFundingAccountResponse,
  mockActivatedFundingAccount,
  mockDeactivatedFundingAccount,
  ADMIN_TOKEN,
  AUTH_TOKEN,
} from "./fixtures/zynk.fixtures";
import CustomError from "../lib/Error";

// Mock functions
const mockVerifyToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetByClerkUserId = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateEntity = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockStartKyc = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetKycStatus = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateFundingAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetFundingAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockActivateFundingAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeactivateFundingAccount = jest.fn<(...args: unknown[]) => Promise<unknown>>();

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
let createZynkTestApp: () => Express;

beforeAll(async () => {
  const module = await import("./helpers/zynkTestApp");
  createZynkTestApp = module.createZynkTestApp;
});

describe("Zynk Routes", () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createZynkTestApp();

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
        .post("/api/zynk/entities")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(201);
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

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", "invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 when user not found for clerk user id", async () => {
      mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ===========================================
  // POST /api/zynk/entities Tests
  // ===========================================
  describe("POST /api/zynk/entities", () => {
    it("should return 201 on successful entity creation", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Zynk entity created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call createEntity with correct user ID", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockCreateEntity).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockCreateEntity.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should return 400 when user has no address", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(400, "User must have an address to create a Zynk entity")
      );

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("address");
    });

    it("should return 400 when user has no public key", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(400, "User does not have a public key")
      );

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("public key");
    });

    it("should return 409 when user already has a Zynk entity", async () => {
      mockCreateEntity.mockRejectedValue(
        new CustomError(409, "User already has a Zynk entity")
      );

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already has");
    });
  });

  // ===========================================
  // POST /api/zynk/kyc Tests
  // ===========================================
  describe("POST /api/zynk/kyc", () => {
    it("should return 200 on successful KYC start", async () => {
      mockStartKyc.mockResolvedValue(mockKycData);

      const response = await request(app)
        .post("/api/zynk/kyc")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("KYC started successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call startKyc with correct user ID", async () => {
      mockStartKyc.mockResolvedValue(mockKycData);

      await request(app)
        .post("/api/zynk/kyc")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockStartKyc).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockStartKyc.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/zynk/kyc")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockStartKyc.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .post("/api/zynk/kyc")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });
  });

  // ===========================================
  // GET /api/zynk/kyc/status Tests
  // ===========================================
  describe("GET /api/zynk/kyc/status", () => {
    it("should return 200 with KYC status", async () => {
      mockGetKycStatus.mockResolvedValue(mockKycStatus);

      const response = await request(app)
        .get("/api/zynk/kyc/status")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("KYC status retrieved successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call getKycStatus with correct user ID", async () => {
      mockGetKycStatus.mockResolvedValue(mockKycStatus);

      await request(app)
        .get("/api/zynk/kyc/status")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGetKycStatus).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockGetKycStatus.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .get("/api/zynk/kyc/status")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockGetKycStatus.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .get("/api/zynk/kyc/status")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account Tests
  // ===========================================
  describe("POST /api/zynk/funding-account", () => {
    it("should return 201 on successful funding account creation", async () => {
      mockCreateFundingAccount.mockResolvedValue(mockCreateFundingAccountResponse);

      const response = await request(app)
        .post("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Funding account created successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call createFundingAccount with correct user ID", async () => {
      mockCreateFundingAccount.mockResolvedValue(mockCreateFundingAccountResponse);

      await request(app)
        .post("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockCreateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockCreateFundingAccount.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockCreateFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });

    it("should return 409 when user already has a funding account", async () => {
      mockCreateFundingAccount.mockRejectedValue(
        new CustomError(409, "User already has a funding account")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already has");
    });
  });

  // ===========================================
  // GET /api/zynk/funding-account Tests
  // ===========================================
  describe("GET /api/zynk/funding-account", () => {
    it("should return 200 with funding account data", async () => {
      mockGetFundingAccount.mockResolvedValue(mockFundingAccount);

      const response = await request(app)
        .get("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Funding account retrieved successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call getFundingAccount with correct user ID", async () => {
      mockGetFundingAccount.mockResolvedValue(mockFundingAccount);

      await request(app)
        .get("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockGetFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockGetFundingAccount.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .get("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockGetFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .get("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });

    it("should return 400 when user has no funding account", async () => {
      mockGetFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a funding account. Create funding account first.")
      );

      const response = await request(app)
        .get("/api/zynk/funding-account")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("funding account");
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account/activate Tests
  // ===========================================
  describe("POST /api/zynk/funding-account/activate", () => {
    it("should return 200 on successful activation", async () => {
      mockActivateFundingAccount.mockResolvedValue(mockActivatedFundingAccount);

      const response = await request(app)
        .post("/api/zynk/funding-account/activate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Funding account activated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call activateFundingAccount with correct user ID", async () => {
      mockActivateFundingAccount.mockResolvedValue(mockActivatedFundingAccount);

      await request(app)
        .post("/api/zynk/funding-account/activate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockActivateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockActivateFundingAccount.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/zynk/funding-account/activate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockActivateFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account/activate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });

    it("should return 400 when user has no funding account", async () => {
      mockActivateFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a funding account. Create funding account first.")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account/activate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("funding account");
    });
  });

  // ===========================================
  // POST /api/zynk/funding-account/deactivate Tests
  // ===========================================
  describe("POST /api/zynk/funding-account/deactivate", () => {
    it("should return 200 on successful deactivation", async () => {
      mockDeactivateFundingAccount.mockResolvedValue(mockDeactivatedFundingAccount);

      const response = await request(app)
        .post("/api/zynk/funding-account/deactivate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Funding account deactivated successfully");
      expect(response.body.data).toBeDefined();
    });

    it("should call deactivateFundingAccount with correct user ID", async () => {
      mockDeactivateFundingAccount.mockResolvedValue(mockDeactivatedFundingAccount);

      await request(app)
        .post("/api/zynk/funding-account/deactivate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(mockDeactivateFundingAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return 404 when user not found", async () => {
      mockDeactivateFundingAccount.mockRejectedValue(new CustomError(404, "User not found"));

      const response = await request(app)
        .post("/api/zynk/funding-account/deactivate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 when user has no Zynk entity", async () => {
      mockDeactivateFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a Zynk entity. Create entity first.")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account/deactivate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Zynk entity");
    });

    it("should return 400 when user has no funding account", async () => {
      mockDeactivateFundingAccount.mockRejectedValue(
        new CustomError(400, "User does not have a funding account. Create funding account first.")
      );

      const response = await request(app)
        .post("/api/zynk/funding-account/deactivate")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("funding account");
    });
  });

  // ===========================================
  // Response Format Tests
  // ===========================================
  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse);

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return 500 for internal server errors", async () => {
      mockCreateEntity.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .post("/api/zynk/entities")
        .set("x-api-token", ADMIN_TOKEN)
        .set("x-auth-token", AUTH_TOKEN);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
