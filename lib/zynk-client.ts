import axios from "axios";

const zynkClient = axios.create({
  baseURL: process.env.ZYNK_API_BASE_URL,
  withCredentials: true,
});

zynkClient.interceptors.request.use(async (config) => {
  config.headers["x-api-token"] = process.env.ZYNK_API_TOKEN;
  return config;
});

export default zynkClient;
