import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().trim().min(1).default("mongodb://127.0.0.1:27017"),
  MONGODB_DB_NAME: z.string().trim().min(1).default("renew"),
});

export const env = envSchema.parse(process.env);
