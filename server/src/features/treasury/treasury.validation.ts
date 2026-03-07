import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

export const treasuryMerchantParamSchema = z.object({
  merchantId: objectIdSchema,
});

export const treasuryOperationParamSchema = z.object({
  operationId: objectIdSchema,
});

export const treasurySignerParamSchema = z.object({
  merchantId: objectIdSchema,
  teamMemberId: objectIdSchema,
});

export const createTreasurySignerChallengeSchema = z.object({
  walletAddress: addressSchema,
});

export const verifyTreasurySignerSchema = z.object({
  signature: z.string().trim().min(10).max(2048),
});

export const bootstrapTreasurySchema = z
  .object({
    mode: z.enum(["create", "import"]),
    threshold: z.coerce.number().int().min(1).max(5).optional(),
    ownerTeamMemberIds: z.array(objectIdSchema).default([]),
    safeAddress: addressSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.mode === "create") {
      if (input.ownerTeamMemberIds.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one verified owner is required to create a treasury Safe.",
          path: ["ownerTeamMemberIds"],
        });
      }

      if (
        input.threshold !== undefined &&
        input.ownerTeamMemberIds.length > 0 &&
        input.threshold > input.ownerTeamMemberIds.length
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Threshold cannot exceed the number of selected owners.",
          path: ["threshold"],
        });
      }
    }

    if (input.mode === "import" && !input.safeAddress) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A Safe address is required when importing treasury custody.",
        path: ["safeAddress"],
      });
    }
  });

export const approveTreasuryOperationSchema = z.object({
  signature: z.string().trim().min(10).max(2048),
});

export const rejectTreasuryOperationSchema = z.object({
  reason: z.string().trim().min(2).max(240),
});

export const addTreasuryOwnerSchema = z.object({
  teamMemberId: objectIdSchema,
  threshold: z.coerce.number().int().min(1).max(10).optional(),
});

export const removeTreasuryOwnerSchema = z.object({
  threshold: z.coerce.number().int().min(1).max(10).optional(),
});

export const updateTreasuryThresholdSchema = z.object({
  threshold: z.coerce.number().int().min(1).max(10),
});

export type CreateTreasurySignerChallengeInput = z.infer<
  typeof createTreasurySignerChallengeSchema
>;
export type VerifyTreasurySignerInput = z.infer<
  typeof verifyTreasurySignerSchema
>;
export type BootstrapTreasuryInput = z.infer<typeof bootstrapTreasurySchema>;
export type ApproveTreasuryOperationInput = z.infer<
  typeof approveTreasuryOperationSchema
>;
export type RejectTreasuryOperationInput = z.infer<
  typeof rejectTreasuryOperationSchema
>;
export type AddTreasuryOwnerInput = z.infer<typeof addTreasuryOwnerSchema>;
export type RemoveTreasuryOwnerInput = z.infer<typeof removeTreasuryOwnerSchema>;
export type UpdateTreasuryThresholdInput = z.infer<
  typeof updateTreasuryThresholdSchema
>;
