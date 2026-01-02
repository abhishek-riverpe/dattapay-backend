import axios, { AxiosError } from "axios";
import AppError from "./AppError";

// Shared type for Zynk API error responses
export interface ZynkErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details: string;
  };
}

/**
 * Handles Zynk API errors consistently across all repositories.
 * Converts AxiosError to AppError with appropriate status and message.
 */
export function handleZynkError(error: unknown, fallbackMessage: string): never {
  if (error instanceof AxiosError && error.response) {
    const zynkError = error.response.data as ZynkErrorResponse;

    if (zynkError?.error) {
      const errorMessage = zynkError.error.details || zynkError.error.message;
      throw new AppError(zynkError.error.code, errorMessage);
    }

    throw new AppError(error.response.status, fallbackMessage);
  }

  throw new AppError(500, "Failed to connect to Zynk API");
}

const zynkClient = axios.create({
  baseURL: process.env.ZYNK_API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout to prevent hung requests
});

zynkClient.interceptors.request.use(async (config) => {
  config.headers["x-api-token"] = process.env.ZYNK_API_TOKEN;
  return config;
});

const ENTITY_ID_PATTERN = /^[\w-]+$/;

export const preparePasskeyRegistration = async (
  entityId: string,
  passkeyData: object
) => {
  if (!ENTITY_ID_PATTERN.test(entityId)) {
    throw new Error("Invalid entity ID format");
  }
  return zynkClient.post(
    `/api/v1/wallets/${entityId}/prepare-passkey-registration`,
    passkeyData
  );
};

export const submitPasskeyRegistration = async (
  payloadId: string,
  signature: string
) => {
  return zynkClient.post("/api/v1/wallets/submit-passkey-registration", {
    payloadId,
    signature,
  });
};

export default zynkClient;
