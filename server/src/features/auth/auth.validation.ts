import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");
const marketSchema = z.string().trim().min(2).max(8).toUpperCase();

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(160, "Password must be at most 160 characters.");

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  billingTimezone: z.string().trim().min(2).max(80).default("UTC"),
  supportedMarkets: z.array(marketSchema).min(1).default(["NGN"]),
});

export const loginSchema = z.object({
  merchantId: objectIdSchema.optional(),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
});

export const activateInviteSchema = z.object({
  merchantId: objectIdSchema,
  inviteToken: z.string().trim().uuid(),
  password: passwordSchema,
});

export const authTokenPayloadSchema = z.object({
  sub: objectIdSchema,
  merchantId: objectIdSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;
