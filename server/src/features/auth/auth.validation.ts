import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(160, "Password must be at most 160 characters.");

export const loginSchema = z.object({
  merchantId: objectIdSchema,
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

export type LoginInput = z.infer<typeof loginSchema>;
export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
export type AuthTokenPayload = z.infer<typeof authTokenPayloadSchema>;
