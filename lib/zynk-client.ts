import axios from "axios";

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
