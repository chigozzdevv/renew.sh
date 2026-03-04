import { z } from "zod";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

export const createSettlementSchema = z.object({
  merchantId: z.string().trim().min(1),
  sourceChargeId: z.string().trim().min(1).nullable().optional(),
  batchRef: z.string().trim().min(2).max(120),
  grossUsdc: z.coerce.number().positive(),
  feeUsdc: z.coerce.number().nonnegative().default(0),
  netUsdc: z.coerce.number().positive(),
  destinationWallet: addressSchema,
  status: z.enum(["queued", "confirming", "settled"]).default("queued"),
  txHash: z.string().trim().min(1).nullable().optional(),
  scheduledFor: z.coerce.date(),
  settledAt: z.coerce.date().nullable().optional(),
});

export const listSettlementsQuerySchema = z.object({
  merchantId: z.string().trim().min(1).optional(),
  status: z.enum(["queued", "confirming", "settled"]).optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateSettlementSchema = z.object({
  status: z.enum(["queued", "confirming", "settled"]).optional(),
  txHash: z.string().trim().min(1).nullable().optional(),
  sourceChargeId: z.string().trim().min(1).nullable().optional(),
  settledAt: z.coerce.date().nullable().optional(),
  scheduledFor: z.coerce.date().optional(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type ListSettlementsQuery = z.infer<typeof listSettlementsQuerySchema>;
export type UpdateSettlementInput = z.infer<typeof updateSettlementSchema>;
