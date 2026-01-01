import { jest } from "@jest/globals";

// Set test environment variables
process.env.ADMIN_TOKEN_SECRET = "test-admin-secret";
process.env.CLERK_SECRET_KEY = "test-clerk-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

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
