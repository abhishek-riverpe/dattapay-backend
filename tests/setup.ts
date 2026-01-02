import { jest } from "@jest/globals";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.ADMIN_TOKEN_SECRET = "test-admin-secret";
process.env.CLERK_SECRET_KEY = "test-clerk-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
process.env.TEST_USER_EMAIL = "john.doe@example.com";
process.env.BYPASS_AUTH_USER_LOOKUP = "true";

// Mock the logger to prevent console output during tests
jest.mock("../lib/logger", () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(10000);
