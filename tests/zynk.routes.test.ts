import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Express, Router } from "express";
import request from "supertest";
import AppError from "../lib/Error";
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

type EndpointCase = {
  method: "get" | "post";
  endpoint: string;
  mockFn: () => jest.Mock;
  name: string;
};

function runErrorSuite(
  title: string,
  cases: EndpointCase[],
  errorFactory: () => AppError,
  expectedStatus: number,
  messageContains: string
) {
  describe.each(cases)(title, ({ method, endpoint, mockFn }) => {
    it(`should return ${expectedStatus} when ${messageContains}`, async () => {
      mockFn().mockRejectedValue(errorFactory() as never);

      const response = await authRequest(method, endpoint);
      expectErrorResponse(response, expectedStatus, messageContains);
    });
  });
}

  // ===========================================
  // Admin Middleware Tests (using shared helper)
  // ===========================================
  createAdminMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/zynk/entities",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse),
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Auth Middleware Tests (using shared helper)
  // ===========================================
  createAuthMiddlewareTests({
    getApp: () => app,
    endpoint: "/api/zynk/entities",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    mockVerifyToken: mockVerifyToken as jest.Mock,
    mockGetByClerkUserId: mockGetByClerkUserId as jest.Mock,
  });

  // ===========================================
  // Parameterized Error Scenarios
  // ===========================================
  const commonErrorCases: EndpointCase[] = [
    { method: "post", endpoint: "/api/zynk/entities", mockFn: () => mockCreateEntity, name: "entities" },
    { method: "post", endpoint: "/api/zynk/kyc", mockFn: () => mockStartKyc, name: "kyc" },
    { method: "get", endpoint: "/api/zynk/kyc/status", mockFn: () => mockGetKycStatus, name: "kyc/status" },
    { method: "post", endpoint: "/api/zynk/funding-account", mockFn: () => mockCreateFundingAccount, name: "funding-account POST" },
    { method: "get", endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post", endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post", endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ];

  const noEntityCases: EndpointCase[] = [
    { method: "post", endpoint: "/api/zynk/kyc", mockFn: () => mockStartKyc, name: "kyc" },
    { method: "get", endpoint: "/api/zynk/kyc/status", mockFn: () => mockGetKycStatus, name: "kyc/status" },
    { method: "post", endpoint: "/api/zynk/funding-account", mockFn: () => mockCreateFundingAccount, name: "funding-account POST" },
    { method: "get", endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post", endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post", endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ];

  const noFundingCases: EndpointCase[] = [
    { method: "get", endpoint: "/api/zynk/funding-account", mockFn: () => mockGetFundingAccount, name: "funding-account GET" },
    { method: "post", endpoint: "/api/zynk/funding-account/activate", mockFn: () => mockActivateFundingAccount, name: "activate" },
    { method: "post", endpoint: "/api/zynk/funding-account/deactivate", mockFn: () => mockDeactivateFundingAccount, name: "deactivate" },
  ];

  runErrorSuite(
    "$name - Common Errors",
    commonErrorCases,
    () => new AppError(404, "User not found"),
    404,
    "not found"
  );

  runErrorSuite(
    "$name - No Zynk Entity",
    noEntityCases,
    () => new AppError(400, "User does not have a Zynk entity. Create entity first."),
    400,
    "Zynk entity"
  );

  runErrorSuite(
    "$name - No Funding Account",
    noFundingCases,
    () => new AppError(400, "User does not have a funding account. Create funding account first."),
    400,
    "funding account"
  );

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

    it.each([
      { error: new AppError(400, "User must have an address to create a Zynk entity"), message: "address", desc: "user has no address" },
      { error: new AppError(400, "User does not have a public key"), message: "public key", desc: "user has no public key" },
      { error: new AppError(409, "User already has a Zynk entity"), message: "already has", desc: "user already has a Zynk entity" },
    ])("should return appropriate error when $desc", async ({ error, message }) => {
      mockCreateEntity.mockRejectedValue(error);

      const response = await authRequest("post", "/api/zynk/entities");
      expectErrorResponse(response, error.status, message);
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
        new AppError(409, "User already has a funding account")
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
  // Response Format Tests (using shared helper)
  // ===========================================
  createResponseFormatTests({
    getApp: () => app,
    endpoint: "/api/zynk/entities",
    method: "post",
    adminToken: ADMIN_TOKEN,
    authToken: AUTH_TOKEN,
    setupSuccessMock: () => mockCreateEntity.mockResolvedValue(mockCreatedEntityResponse),
    setupErrorMock: () => mockCreateEntity.mockRejectedValue(new Error("Database connection failed")),
  });
});
