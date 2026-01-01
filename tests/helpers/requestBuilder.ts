import type { Express } from "express";
import request, { Test } from "supertest";
import { ADMIN_TOKEN, AUTH_TOKEN } from "../fixtures/common.fixtures";

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export interface RequestBuilderConfig {
  app: Express;
  adminToken?: string;
  authToken?: string;
}

/**
 * Creates an authenticated request builder for testing
 * This reduces boilerplate for setting up auth headers on requests
 */
export class AuthenticatedRequestBuilder {
  private app: Express;
  private adminToken: string;
  private authToken: string;

  constructor(config: RequestBuilderConfig) {
    this.app = config.app;
    this.adminToken = config.adminToken ?? ADMIN_TOKEN;
    this.authToken = config.authToken ?? AUTH_TOKEN;
  }

  /**
   * Update the app instance (useful in beforeEach when app is recreated)
   */
  setApp(app: Express): void {
    this.app = app;
  }

  /**
   * Create an authenticated request with both admin and auth tokens
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with auth headers set
   */
  request(method: HttpMethod, endpoint: string): Test {
    return request(this.app)
      [method](endpoint)
      .set("x-api-token", this.adminToken)
      .set("x-auth-token", this.authToken);
  }

  /**
   * Create a GET request with auth headers
   */
  get(endpoint: string): Test {
    return this.request("get", endpoint);
  }

  /**
   * Create a POST request with auth headers
   */
  post(endpoint: string): Test {
    return this.request("post", endpoint);
  }

  /**
   * Create a PUT request with auth headers
   */
  put(endpoint: string): Test {
    return this.request("put", endpoint);
  }

  /**
   * Create a DELETE request with auth headers
   */
  delete(endpoint: string): Test {
    return this.request("delete", endpoint);
  }

  /**
   * Create a PATCH request with auth headers
   */
  patch(endpoint: string): Test {
    return this.request("patch", endpoint);
  }

  /**
   * Create a request with only admin token (no auth token)
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with only admin token
   */
  adminOnly(method: HttpMethod, endpoint: string): Test {
    return request(this.app)
      [method](endpoint)
      .set("x-api-token", this.adminToken);
  }

  /**
   * Create a request with only auth token (no admin token)
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with only auth token
   */
  authOnly(method: HttpMethod, endpoint: string): Test {
    return request(this.app)
      [method](endpoint)
      .set("x-auth-token", this.authToken);
  }

  /**
   * Create a request with invalid admin token
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with invalid admin token
   */
  withInvalidAdminToken(method: HttpMethod, endpoint: string): Test {
    return request(this.app)
      [method](endpoint)
      .set("x-api-token", "invalid-token")
      .set("x-auth-token", this.authToken);
  }

  /**
   * Create a request with invalid auth token
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with invalid auth token
   */
  withInvalidAuthToken(method: HttpMethod, endpoint: string): Test {
    return request(this.app)
      [method](endpoint)
      .set("x-api-token", this.adminToken)
      .set("x-auth-token", "invalid-token");
  }

  /**
   * Create a request with no headers
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @returns Supertest request with no auth headers
   */
  unauthenticated(method: HttpMethod, endpoint: string): Test {
    return request(this.app)[method](endpoint);
  }
}

/**
 * Factory function to create an authenticated request builder
 */
export function createAuthenticatedRequestBuilder(
  config: RequestBuilderConfig
): AuthenticatedRequestBuilder {
  return new AuthenticatedRequestBuilder(config);
}

/**
 * Simple function to create an authenticated request
 * @param app - Express app instance
 * @param method - HTTP method
 * @param endpoint - API endpoint
 * @param adminToken - Admin token (defaults to ADMIN_TOKEN)
 * @param authToken - Auth token (defaults to AUTH_TOKEN)
 */
export function createAuthenticatedRequest(
  app: Express,
  method: HttpMethod,
  endpoint: string,
  adminToken: string = ADMIN_TOKEN,
  authToken: string = AUTH_TOKEN
): Test {
  return request(app)
    [method](endpoint)
    .set("x-api-token", adminToken)
    .set("x-auth-token", authToken);
}
