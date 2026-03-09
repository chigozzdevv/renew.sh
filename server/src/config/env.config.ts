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
    SAFE_TX_SERVICE_URL_TEST: z
      .string()
      .trim()
      .default("https://safe-transaction-avalanche-testnet.safe.global"),
    SAFE_TX_SERVICE_URL_LIVE: z
      .string()
      .trim()
      .default("https://safe-transaction-avalanche.safe.global"),
    DEPLOYER_PRIVATE_KEY_TEST: z.string().trim().default(""),
    DEPLOYER_PRIVATE_KEY_LIVE: z.string().trim().default(""),
    SAFE_EXECUTOR_PRIVATE_KEY_TEST: z.string().trim().default(""),
    SAFE_EXECUTOR_PRIVATE_KEY_LIVE: z.string().trim().default(""),
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
      .default("0x5425890298aed601595a70AB815c96711a31Bc65"),
    USDC_TOKEN_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    CCTP_SOURCE_CHAIN_ID_TEST: z.coerce.number().int().positive().default(11155111),
    CCTP_SOURCE_CHAIN_ID_LIVE: z.coerce.number().int().positive().default(1),
    CCTP_SOURCE_RPC_URL_TEST: z
      .string()
      .trim()
      .min(1)
      .default("https://ethereum-sepolia-rpc.publicnode.com"),
    CCTP_SOURCE_RPC_URL_LIVE: z.string().trim().default(""),
    CCTP_SOURCE_PRIVATE_KEY_TEST: z.string().trim().default(""),
    CCTP_SOURCE_PRIVATE_KEY_LIVE: z.string().trim().default(""),
    CCTP_SOURCE_DOMAIN_TEST: z.coerce.number().int().nonnegative().default(0),
    CCTP_SOURCE_DOMAIN_LIVE: z.coerce.number().int().nonnegative().default(0),
    CCTP_DEST_DOMAIN_TEST: z.coerce.number().int().nonnegative().default(1),
    CCTP_DEST_DOMAIN_LIVE: z.coerce.number().int().nonnegative().default(1),
    CCTP_SOURCE_USDC_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"),
    CCTP_SOURCE_USDC_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    CCTP_TOKEN_MESSENGER_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"),
    CCTP_TOKEN_MESSENGER_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    CCTP_MESSAGE_TRANSMITTER_ADDRESS_TEST: z
      .string()
      .trim()
      .min(1)
      .default("0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275"),
    CCTP_MESSAGE_TRANSMITTER_ADDRESS_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("0x0000000000000000000000000000000000000000"),
    CCTP_ATTESTATION_API_URL_TEST: z
      .string()
      .trim()
      .min(1)
      .default("https://iris-api-sandbox.circle.com"),
    CCTP_ATTESTATION_API_URL_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("https://iris-api.circle.com"),
    CCTP_ATTESTATION_POLL_INTERVAL_MS: z
      .coerce
      .number()
      .int()
      .positive()
      .default(2000),
    CCTP_ATTESTATION_TIMEOUT_MS: z.coerce.number().int().positive().default(1200000),
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
    SUMSUB_BASE_URL_TEST: z
      .string()
      .trim()
      .min(1)
      .default("https://api.sumsub.com"),
    SUMSUB_BASE_URL_LIVE: z
      .string()
      .trim()
      .min(1)
      .default("https://api.sumsub.com"),
    SUMSUB_APP_TOKEN_TEST: z.string().trim().default(""),
    SUMSUB_APP_TOKEN_LIVE: z.string().trim().default(""),
    SUMSUB_SECRET_KEY_TEST: z.string().trim().default(""),
    SUMSUB_SECRET_KEY_LIVE: z.string().trim().default(""),
    SUMSUB_LEVEL_NAME_KYC_TEST: z.string().trim().min(1).default("renew-kyc-test"),
    SUMSUB_LEVEL_NAME_KYC_LIVE: z.string().trim().min(1).default("renew-kyc-live"),
    SUMSUB_LEVEL_NAME_KYB_TEST: z.string().trim().min(1).default("renew-kyb-test"),
    SUMSUB_LEVEL_NAME_KYB_LIVE: z.string().trim().min(1).default("renew-kyb-live"),
    SUMSUB_WEBHOOK_SECRET_TEST: z.string().trim().default(""),
    SUMSUB_WEBHOOK_SECRET_LIVE: z.string().trim().default(""),
    SUMSUB_SDK_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    SUMSUB_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    DEVELOPER_WEBHOOK_SECRET_ENCRYPTION_KEY: z.string().trim().min(32),
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
