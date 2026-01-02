import { describe, it, expect } from "@jest/globals";
import type { Express } from "express";
import request from "supertest";

export interface MiddlewareTestConfig {
  getApp: () => Express;
  endpoint: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  adminToken: string;
  authToken: string;
  setupSuccessMock?: () => void;
  mockVerifyToken: jest.Mock;
  mockGetByClerkUserId: jest.Mock;
  payload?: Record<string, unknown>;
}

/**
 * Creates Admin Middleware test suite
 */
export function createAdminMiddlewareTests(config: MiddlewareTestConfig) {
  const {
    getApp,
    endpoint,
    method,
    adminToken,
    authToken,
    setupSuccessMock,
    payload,
  } = config;

  describe("Admin Middleware", () => {
    it("should return 403 when x-api-token header is missing", async () => {
      let req = request(getApp())[method](endpoint).set("x-auth-token", authToken);
      if (payload) {
        req = req.send(payload);
      }

      const response = await req;

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access denied");
    });

    it("should return 403 when x-api-token is invalid", async () => {
      let req = request(getApp())
        [method](endpoint)
        .set("x-api-token", "invalid-token")
        .set("x-auth-token", authToken);
      if (payload) {
        req = req.send(payload);
      }

      const response = await req;

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should allow access with valid x-api-token", async () => {
      if (setupSuccessMock) {
        setupSuccessMock();
      }

      let req = request(getApp())
        [method](endpoint)
        .set("x-api-token", adminToken)
        .set("x-auth-token", authToken);
      if (payload) {
        req = req.send(payload);
      }

      const response = await req;

      expect([200, 201]).toContain(response.status);
    });
  });
}

/**
 * Creates Auth Middleware test suite
 */
export function createAuthMiddlewareTests(config: MiddlewareTestConfig) {
  const {
    getApp,
    endpoint,
    method,
    adminToken,
    authToken,
    mockVerifyToken,
    mockGetByClerkUserId,
    payload,
  } = config;

  describe("Auth Middleware", () => {
    it("should return 401 when x-auth-token header is missing", async () => {
      let req = request(getApp())[method](endpoint).set("x-api-token", adminToken);
      if (payload) {
        req = req.send(payload);
      }

      const response = await req;

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("token");
    });

    it("should return 401 when token verification fails", async () => {
      mockVerifyToken.mockRejectedValue(new Error("Invalid token"));

      let req = request(getApp())
        [method](endpoint)
        .set("x-api-token", adminToken)
        .set("x-auth-token", "invalid-token");
      if (payload) {
        req = req.send(payload);
      }

      const response = await req;

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    if (process.env.BYPASS_AUTH_USER_LOOKUP !== "true") {
      it("should return 401 when user not found for clerk user id", async () => {
        mockGetByClerkUserId.mockRejectedValue(new Error("User not found"));

        let req = request(getApp())
          [method](endpoint)
          .set("x-api-token", adminToken)
          .set("x-auth-token", authToken);
        if (payload) {
          req = req.send(payload);
        }

        const response = await req;

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    }
  });
}
