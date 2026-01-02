import { describe, it, expect } from "@jest/globals";
import type { Express } from "express";
import request, { Test } from "supertest";

export interface ResponseFormatTestConfig {
  getApp: () => Express;
  endpoint: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  adminToken?: string;
  authToken?: string;
  setupSuccessMock: () => void;
  setupErrorMock: () => void;
  payload?: Record<string, unknown>;
  customHeaders?: Record<string, string>;
}

/**
 * Creates Response Format test suite
 */
export function createResponseFormatTests(config: ResponseFormatTestConfig) {
  const {
    getApp,
    endpoint,
    method,
    adminToken,
    authToken,
    setupSuccessMock,
    setupErrorMock,
    payload,
    customHeaders = {},
  } = config;

  // Helper to build request with common headers and payload
  function buildRequest(): Test {
    let req = request(getApp())[method](endpoint);
    if (adminToken) {
      req = req.set("x-api-token", adminToken);
    }
    if (authToken) {
      req = req.set("x-auth-token", authToken);
    }
    Object.entries(customHeaders).forEach(([key, value]) => {
      req = req.set(key, value);
    });
    if (payload) {
      req = req.send(payload);
    }
    return req;
  }

  describe("Response Format", () => {
    it("should always return success boolean", async () => {
      setupSuccessMock();
      const response = await buildRequest();
      expect(typeof response.body.success).toBe("boolean");
    });

    it("should always return message string", async () => {
      setupSuccessMock();
      const response = await buildRequest();
      expect(typeof response.body.message).toBe("string");
    });

    it("should return JSON content type", async () => {
      setupSuccessMock();
      const response = await buildRequest();
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should return error response for internal server errors", async () => {
      setupErrorMock();
      const response = await buildRequest();
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
}
