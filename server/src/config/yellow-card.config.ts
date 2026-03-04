import { env } from "@/config/env.config";

export function getYellowCardConfig() {
  return {
    baseUrl: env.YELLOW_CARD_BASE_URL,
    apiKey: env.YELLOW_CARD_API_KEY,
    timestampHeader: env.YELLOW_CARD_TIMESTAMP_HEADER,
    timeoutMs: env.YELLOW_CARD_TIMEOUT_MS,
    mockMode: env.YELLOW_CARD_MOCK_MODE || env.YELLOW_CARD_API_KEY.length === 0,
  };
}

export type YellowCardRuntimeConfig = ReturnType<typeof getYellowCardConfig>;
