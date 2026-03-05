import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const booleanEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean" ? value : value.trim().toLowerCase() !== "false"
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().trim().min(1).default("mongodb://127.0.0.1:27017"),
    MONGODB_DB_NAME: z.string().trim().min(1).default("renew"),
    CORS_ORIGINS: z.string().trim().default("http://localhost:3000"),
    PAYMENT_ENV: z.enum(["test", "live"]).default("test"),
    AVALANCHE_ENV: z.enum(["test", "live"]).default("test"),
    AVALANCHE_CHAIN_ID_TEST: z.coerce.number().int().positive().default(43113),
    AVALANCHE_CHAIN_ID_LIVE: z.coerce.number().int().positive().default(43114),
    AVALANCHE_RPC_URL_TEST: z
      .string()
      .trim()
      .min(1)
      .default("https://api.avax-test.network/ext/bc/C/rpc"),
    AVALANCHE_RPC_URL_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("https://api.avax.network/ext/bc/C/rpc"),
    RENEW_PROTOCOL_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    RENEW_PROTOCOL_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    RENEW_VAULT_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    RENEW_VAULT_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    USDC_TOKEN_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    USDC_TOKEN_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    ENABLE_WORKERS: booleanEnv.default(true),
    REDIS_URL: z.string().trim().min(1).default("redis://127.0.0.1:6379"),
    REDIS_QUEUE_PREFIX: z.string().trim().min(1).default("renew"),
    REDIS_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
    YELLOW_CARD_BASE_URL_TEST: z
      .string()
      .trim()
      .min(1)
      .default("https://sandbox.api.yellowcard.io/business"),
    YELLOW_CARD_BASE_URL_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("https://api.yellowcard.io/business"),
    YELLOW_CARD_API_KEY_TEST: z.string().trim().default(""),
    YELLOW_CARD_API_KEY_LIVE: z.string().trim().default(""),
    YELLOW_CARD_TIMESTAMP_HEADER: z
      .string()
      .trim()
      .min(1)
      .default("X-YC-Timestamp"),
    YELLOW_CARD_WEBHOOK_SECRET_TEST: z.string().trim().default(""),
    YELLOW_CARD_WEBHOOK_SECRET_LIVE: z.string().trim().default(""),
    YELLOW_CARD_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    PLATFORM_AUTH_ENABLED: booleanEnv.default(true),
    PLATFORM_AUTH_JWT_SECRET: z
      .string()
      .trim()
      .min(16)
      .default("renew_dev_jwt_secret_change_before_production"),
    PLATFORM_AUTH_TOKEN_TTL_SECONDS: z
      .coerce
      .number()
      .int()
      .positive()
      .default(8 * 60 * 60),
    PLATFORM_AUTH_PASSWORD_ITERATIONS: z.coerce.number().int().positive().default(310000),
  })
  .refine((input) => input.PAYMENT_ENV === input.AVALANCHE_ENV, {
    message:
      "PAYMENT_ENV and AVALANCHE_ENV must match (both test or both live).",
    path: ["PAYMENT_ENV"],
  });

export const env = envSchema.parse(process.env);

export function getAllowedCorsOrigins() {
  return env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
