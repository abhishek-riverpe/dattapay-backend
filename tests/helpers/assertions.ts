import { expect } from "@jest/globals";
import type { Response } from "supertest";

/**
 * Assert an error response from the API
 * @param response - Supertest response object
 * @param statusCode - Expected HTTP status code
 * @param messageContains - Optional substring to check in the error message
 */
export function expectErrorResponse(
  response: Response,
  statusCode: number,
  messageContains?: string
): void {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  if (messageContains) {
    expect(response.body.message).toContain(messageContains);
  }
}

/**
 * Assert a success response from the API
 * @param response - Supertest response object
 * @param statusCode - Expected HTTP status code
 * @param message - Optional exact message to match
 */
export function expectSuccessResponse(
  response: Response,
  statusCode: number,
  message?: string
): void {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  if (message) {
    expect(response.body.message).toBe(message);
  }
}

/**
 * Assert validation error response (400 status with specific field error)
 * @param response - Supertest response object
 * @param fieldMessage - Substring to check in the validation error message
 */
export function expectValidationError(
  response: Response,
  fieldMessage: string
): void {
  expectErrorResponse(response, 400, fieldMessage);
}

/**
 * Assert unauthorized error response (401 status)
 * @param response - Supertest response object
 * @param messageContains - Optional substring to check in the error message
 */
export function expectUnauthorized(
  response: Response,
  messageContains?: string
): void {
  expectErrorResponse(response, 401, messageContains);
}

/**
 * Assert forbidden error response (403 status)
 * @param response - Supertest response object
 * @param messageContains - Optional substring to check in the error message
 */
export function expectForbidden(
  response: Response,
  messageContains?: string
): void {
  expectErrorResponse(response, 403, messageContains);
}

/**
 * Assert not found error response (404 status)
 * @param response - Supertest response object
 * @param messageContains - Optional substring to check in the error message
 */
export function expectNotFound(
  response: Response,
  messageContains?: string
): void {
  expectErrorResponse(response, 404, messageContains);
}

/**
 * Assert conflict error response (409 status)
 * @param response - Supertest response object
 * @param messageContains - Optional substring to check in the error message
 */
export function expectConflict(
  response: Response,
  messageContains?: string
): void {
  expectErrorResponse(response, 409, messageContains);
}

/**
 * Assert server error response (500 status)
 * @param response - Supertest response object
 */
export function expectServerError(response: Response): void {
  expectErrorResponse(response, 500);
}

/**
 * Assert response has data property defined
 * @param response - Supertest response object
 */
export function expectDataDefined(response: Response): void {
  expect(response.body.data).toBeDefined();
}

/**
 * Assert JSON content type header
 * @param response - Supertest response object
 */
export function expectJsonContentType(response: Response): void {
  expect(response.headers["content-type"]).toMatch(/application\/json/);
}

/**
 * Assert standard response structure (success boolean and message string)
 * @param response - Supertest response object
 */
export function expectStandardResponse(response: Response): void {
  expect(typeof response.body.success).toBe("boolean");
  expect(typeof response.body.message).toBe("string");
}

/**
 * Assert paginated response structure
 * @param response - Supertest response object
 * @param expectedTotal - Optional expected total count
 */
export function expectPaginatedResponse(
  response: Response,
  expectedTotal?: number
): void {
  expect(response.body.data).toBeDefined();
  if (expectedTotal !== undefined) {
    expect(response.body.data.total).toBe(expectedTotal);
  }
}
