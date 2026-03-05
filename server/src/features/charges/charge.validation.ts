import { z } from "zod";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

export const createChargeSchema = z.object({
  merchantId: z.string().trim().min(1),
  subscriptionId: z.string().trim().min(1),
  externalChargeId: z.string().trim().min(2).max(120),
  settlementSource: addressSchema.nullish().transform((value) => value ?? null),
  localAmount: z.coerce.number().positive(),
  fxRate: z.coerce.number().positive(),
  usdcAmount: z.coerce.number().positive(),
  feeAmount: z.coerce.number().nonnegative().default(0),
  status: z
    .enum([
      "pending",
      "awaiting_settlement",
      "confirming",
      "settled",
      "failed",
      "reversed",
    ])
    .default("pending"),
  failureCode: z.string().trim().min(1).nullable().optional(),
  processedAt: z.coerce.date().optional(),
});

export const listChargesQuerySchema = z.object({
  merchantId: z.string().trim().min(1).optional(),
  subscriptionId: z.string().trim().min(1).optional(),
  status: z
    .enum([
      "pending",
      "awaiting_settlement",
      "confirming",
      "settled",
      "failed",
      "reversed",
    ])
    .optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateChargeSchema = z.object({
  status: z
    .enum([
      "pending",
      "awaiting_settlement",
      "confirming",
      "settled",
      "failed",
      "reversed",
    ])
    .optional(),
  failureCode: z.string().trim().min(1).nullable().optional(),
  processedAt: z.coerce.date().optional(),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type ListChargesQuery = z.infer<typeof listChargesQuerySchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
