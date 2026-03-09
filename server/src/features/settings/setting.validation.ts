import { z } from "zod";

import { environmentInputSchema } from "@/shared/utils/runtime-environment";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM address.");

export const merchantParamSchema = z.object({
  merchantId: objectIdSchema,
});

const profileSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(160).optional(),
  supportEmail: z.email().trim().toLowerCase().optional(),
  defaultMarket: z.string().trim().min(2).max(8).toUpperCase().optional(),
  invoicePrefix: z.string().trim().min(2).max(12).toUpperCase().optional(),
  billingTimezone: z.string().trim().min(2).max(80).optional(),
  billingDisplay: z.string().trim().min(2).max(40).optional(),
  fallbackCurrency: z.string().trim().min(2).max(12).toUpperCase().optional(),
  statementDescriptor: z.string().trim().min(2).max(40).optional(),
  brandAccent: z.string().trim().min(2).max(40).optional(),
  customerDomain: z.string().trim().min(2).max(160).optional(),
  invoiceFooter: z.string().trim().min(2).max(240).optional(),
});

const billingSettingsSchema = z.object({
  retryPolicy: z.string().trim().min(2).max(80).optional(),
  invoiceGraceDays: z.coerce.number().int().min(0).max(30).optional(),
  autoRetries: z.boolean().optional(),
  meterApproval: z.boolean().optional(),
});

const walletSettingsSchema = z.object({
  primaryWallet: addressSchema.optional(),
  reserveWallet: addressSchema.nullish().transform((value) => value ?? null),
  walletAlerts: z.boolean().optional(),
});

const notificationSettingsSchema = z.object({
  financeDigest: z.boolean().optional(),
  developerAlerts: z.boolean().optional(),
  loginAlerts: z.boolean().optional(),
});

const securitySettingsSchema = z.object({
  sessionTimeout: z.string().trim().min(2).max(80).optional(),
  inviteDomainPolicy: z.string().trim().min(2).max(120).optional(),
  enforceTwoFactor: z.boolean().optional(),
  restrictInviteDomains: z.boolean().optional(),
  sweepApprovalThreshold: z.coerce.number().int().min(1).max(5).optional(),
});

export const updateSettingsSchema = z
  .object({
    actor: z.string().trim().min(2).max(120).default("system"),
    environment: environmentInputSchema.default("test"),
    profile: profileSettingsSchema.optional(),
    billing: billingSettingsSchema.optional(),
    wallets: walletSettingsSchema.optional(),
    notifications: notificationSettingsSchema.optional(),
    security: securitySettingsSchema.optional(),
  })
  .refine(
    (value) =>
      value.profile !== undefined ||
      value.billing !== undefined ||
      value.wallets !== undefined ||
      value.notifications !== undefined ||
      value.security !== undefined,
    {
      message: "At least one settings section must be provided.",
      path: [],
    }
  );

export const walletActionSchema = z.object({
  actor: z.string().trim().min(2).max(120).default("system"),
  environment: environmentInputSchema.default("test"),
});

export const saveWalletSchema = z.object({
  actor: z.string().trim().min(2).max(120).default("system"),
  environment: environmentInputSchema.default("test"),
  primaryWallet: addressSchema,
  reserveWallet: addressSchema.nullish().transform((value) => value ?? null),
  walletAlerts: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type SaveWalletInput = z.infer<typeof saveWalletSchema>;
export type WalletActionInput = z.infer<typeof walletActionSchema>;
