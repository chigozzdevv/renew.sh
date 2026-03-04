import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().trim().min(1).default("mongodb://127.0.0.1:27017"),
  MONGODB_DB_NAME: z.string().trim().min(1).default("renew"),
  CORS_ORIGINS: z.string().trim().default("http://localhost:3000"),
  AVALANCHE_CHAIN_ID: z.coerce.number().int().positive().default(43114),
  AVALANCHE_RPC_URL: z
    .string()
    .trim()
    .min(1)
    .default("https://api.avax.network/ext/bc/C/rpc"),
  RENEW_PROTOCOL_ADDRESS: z
    .string()
    .trim()
    .min(1)
    .default("0x0000000000000000000000000000000000000000"),
  RENEW_VAULT_ADDRESS: z
    .string()
    .trim()
    .min(1)
    .default("0x0000000000000000000000000000000000000000"),
  USDC_TOKEN_ADDRESS: z
    .string()
    .trim()
    .min(1)
    .default("0x0000000000000000000000000000000000000000"),
  ENABLE_WORKERS: z
    .union([z.boolean(), z.string()])
    .transform((value) =>
      typeof value === "boolean"
        ? value
        : value.trim().toLowerCase() !== "false"
    )
    .default(true),
  REDIS_URL: z.string().trim().min(1).default("redis://127.0.0.1:6379"),
  REDIS_QUEUE_PREFIX: z.string().trim().min(1).default("renew"),
  REDIS_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  YELLOW_CARD_BASE_URL: z
    .string()
    .trim()
    .min(1)
    .default("https://sandbox.api.yellowcard.io/business"),
  YELLOW_CARD_API_KEY: z.string().trim().default(""),
  YELLOW_CARD_TIMESTAMP_HEADER: z
    .string()
    .trim()
    .min(1)
    .default("X-YC-Timestamp"),
  YELLOW_CARD_MOCK_MODE: z
    .union([z.boolean(), z.string()])
    .transform((value) =>
      typeof value === "boolean"
        ? value
        : value.trim().toLowerCase() !== "false"
    )
    .default(true),
  YELLOW_CARD_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});

export const env = envSchema.parse(process.env);

export function getAllowedCorsOrigins() {
  return env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
