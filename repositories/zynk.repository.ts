import { AxiosError } from "axios";
import zynkClient from "../lib/zynk-client";
import Error from "../lib/Error";

interface ZynkEntityData {
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumberPrefix: string;
  phoneNumber: string;
  nationality: string;
  dateOfBirth: string;
  permanentAddress: {
    addressLine1: string;
    addressLine2?: string;
    locality: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

interface ZynkEntityResponse {
  success: boolean;
  data: {
    message: string;
    entityId: string;
  };
}

interface ZynkErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details: string;
  };
}

interface ZynkKycResponse {
  success: boolean;
  data: {
    message: string;
    kycLink: string;
    tosLink: string;
    kycStatus:
      | "not_started"
      | "initiated"
      | "reviewing"
      | "additional_info_required"
      | "rejected"
      | "approved";
  };
}

interface ZynkKycStatusResponse {
  success: boolean;
  message: string;
  data: {
    status: Array<{
      routingId: string;
      supportedRoutes: Array<{
        from: {
          jurisdictionId: string;
          jurisdictionName: string;
          jurisdictionType: string;
          currency: string;
        };
        to: {
          jurisdictionId: string;
          jurisdictionName: string;
          jurisdictionType: string;
          currency: string;
        };
      }>;
      kycStatus: string;
      routingEnabled: boolean;
      kycFees: {
        network: string;
        currency: string;
        tokenAddress: string;
        amount: number;
        toWalletAddress: string;
        paymentReceived: boolean;
      };
    }>;
  };
}

class ZynkRepository {
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      await zynkClient.get(`/api/v1/transformer/entity/email/${email}`);
      return true; // 200 response means email exists
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return false; // 404 means email not found
      }
      throw new Error(500, "Failed to check email with Zynk ");
    }
  }

  async createEntity(data: ZynkEntityData): Promise<ZynkEntityResponse> {
    try {
      const response = await zynkClient.post<ZynkEntityResponse>(
        "/api/v1/transformer/entity/create",
        data
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(error.response.status, "API request failed");
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }

  async startKyc(entityId: string): Promise<ZynkKycResponse> {
    const routingId = process.env.ZYNK_ROUTING_ID;

    if (!routingId) {
      throw new Error(500, "ZYNK_ROUTING_ID is not configured");
    }

    try {
      const response = await zynkClient.post<ZynkKycResponse>(
        `/api/v1/transformer/entity/kyc/${entityId}/${routingId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new Error(404, "Entity not found in Zynk");
        }

        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(error.response.status, "KYC request failed");
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }

  async getKycStatus(entityId: string): Promise<ZynkKycStatusResponse> {
    try {
      const response = await zynkClient.get<ZynkKycStatusResponse>(
        `/api/v1/transformer/entity/kyc/${entityId}`
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const zynkError = error.response.data as ZynkErrorResponse;

        if (zynkError?.error) {
          const errorMessage =
            zynkError.error.details || zynkError.error.message;
          throw new Error(zynkError.error.code, errorMessage);
        }

        throw new Error(error.response.status, "Failed to get KYC status");
      }

      throw new Error(500, "Failed to connect to Zynk API");
    }
  }
}

export default new ZynkRepository();
export type { ZynkEntityData, ZynkEntityResponse, ZynkKycResponse, ZynkKycStatusResponse };
