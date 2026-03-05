import { z } from "zod";

import { runtimeModes } from "@/shared/constants/runtime-mode";

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

const marketSchema = z.string().trim().min(2).max(8).toUpperCase();

export const createMerchantSchema = z.object({
  merchantAccount: addressSchema,
  payoutWallet: addressSchema,
  reserveWallet: addressSchema.nullish().transform((value) => value ?? null),
  name: z.string().trim().min(2).max(120),
  supportEmail: z.email().trim().toLowerCase(),
  billingTimezone: z.string().trim().min(2).default("UTC"),
  supportedMarkets: z.array(marketSchema).min(1),
  metadataHash: z.string().trim().min(1).default("0x0"),
  status: z.enum(["active", "paused"]).default("active"),
  environmentMode: z.enum(runtimeModes).default("test"),
});

export const listMerchantsQuerySchema = z.object({
  status: z.enum(["active", "paused"]).optional(),
  search: z.string().trim().min(1).optional(),
});

export const updateMerchantSchema = createMerchantSchema
  .omit({ merchantAccount: true })
  .partial();

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type ListMerchantsQuery = z.infer<typeof listMerchantsQuerySchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
