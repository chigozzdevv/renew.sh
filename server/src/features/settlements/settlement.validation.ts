import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

const settlementStatusSchema = z.enum([
  "queued",
  "confirming",
  "settled",
  "failed",
  "reversed",
]);

const sweepApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "executed",
]);

export const createSettlementSchema = z.object({
  merchantId: objectIdSchema,
  sourceChargeId: objectIdSchema.nullable().optional(),
  batchRef: z.string().trim().min(2).max(120),
  grossUsdc: z.coerce.number().positive(),
  feeUsdc: z.coerce.number().nonnegative().default(0),
  netUsdc: z.coerce.number().positive(),
  destinationWallet: addressSchema,
  status: settlementStatusSchema.default("queued"),
  txHash: z.string().trim().min(1).nullable().optional(),
  submittedAt: z.coerce.date().nullable().optional(),
  scheduledFor: z.coerce.date(),
  settledAt: z.coerce.date().nullable().optional(),
  reversedAt: z.coerce.date().nullable().optional(),
  reversalReason: z.string().trim().min(2).max(240).nullable().optional(),
});

export const listSettlementsQuerySchema = z.object({
  merchantId: objectIdSchema.optional(),
  status: settlementStatusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateSettlementSchema = z.object({
  status: settlementStatusSchema.optional(),
  txHash: z.string().trim().min(1).nullable().optional(),
  submittedAt: z.coerce.date().nullable().optional(),
  sourceChargeId: objectIdSchema.nullable().optional(),
  settledAt: z.coerce.date().nullable().optional(),
  reversedAt: z.coerce.date().nullable().optional(),
  reversalReason: z.string().trim().min(2).max(240).nullable().optional(),
  scheduledFor: z.coerce.date().optional(),
});

export const settlementParamSchema = z.object({
  settlementId: objectIdSchema,
});

export const settlementActionSchema = z.object({
  merchantId: objectIdSchema,
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const requestSweepApprovalSchema = settlementActionSchema.extend({
  threshold: z.coerce.number().int().min(1).max(5).optional(),
});

export const rejectSweepApprovalSchema = settlementActionSchema.extend({
  reason: z.string().trim().min(2).max(240),
});

export const listSweepApprovalsQuerySchema = z.object({
  merchantId: objectIdSchema,
  status: sweepApprovalStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type ListSettlementsQuery = z.infer<typeof listSettlementsQuerySchema>;
export type UpdateSettlementInput = z.infer<typeof updateSettlementSchema>;
export type SettlementActionInput = z.infer<typeof settlementActionSchema>;
export type RequestSweepApprovalInput = z.infer<typeof requestSweepApprovalSchema>;
export type RejectSweepApprovalInput = z.infer<typeof rejectSweepApprovalSchema>;
export type ListSweepApprovalsQuery = z.infer<typeof listSweepApprovalsQuerySchema>;
