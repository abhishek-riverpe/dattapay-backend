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
}

export default new ZynkRepository();
export type { ZynkEntityData, ZynkEntityResponse };
