import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const environmentSchema = z.enum(["test", "live"]);
const keyStatusSchema = z.enum(["active", "revoked"]);
const webhookStatusSchema = z.enum(["active", "disabled"]);
const deliveryStatusSchema = z.enum(["queued", "delivered", "failed"]);

const eventTypeSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9._-]+$/i, "Event type format is invalid.");

export const listDeveloperKeysQuerySchema = z.object({
  merchantId: objectIdSchema,
  environment: environmentSchema.optional(),
  status: keyStatusSchema.optional(),
});

export const createDeveloperKeySchema = z.object({
  merchantId: objectIdSchema,
  label: z.string().trim().min(2).max(120),
  environment: environmentSchema.default("test"),
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const developerKeyParamSchema = z.object({
  developerKeyId: objectIdSchema,
});

export const developerKeyActionSchema = z.object({
  merchantId: objectIdSchema,
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const listWebhooksQuerySchema = z.object({
  merchantId: objectIdSchema,
  status: webhookStatusSchema.optional(),
});

export const createWebhookSchema = z.object({
  merchantId: objectIdSchema,
  label: z.string().trim().min(2).max(120),
  endpointUrl: z.url().trim(),
  eventTypes: z.array(eventTypeSchema).min(1),
  retryPolicy: z.enum(["none", "linear", "exponential"]).default("exponential"),
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const webhookParamSchema = z.object({
  webhookId: objectIdSchema,
});

export const updateWebhookSchema = z
  .object({
    label: z.string().trim().min(2).max(120).optional(),
    endpointUrl: z.url().trim().optional(),
    eventTypes: z.array(eventTypeSchema).min(1).optional(),
    retryPolicy: z.enum(["none", "linear", "exponential"]).optional(),
    status: webhookStatusSchema.optional(),
    actor: z.string().trim().min(2).max(120).default("system"),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.endpointUrl !== undefined ||
      value.eventTypes !== undefined ||
      value.retryPolicy !== undefined ||
      value.status !== undefined,
    {
      message: "At least one editable field must be provided.",
      path: [],
    }
  );

export const webhookActionSchema = z.object({
  merchantId: objectIdSchema,
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const createTestDeliverySchema = z.object({
  merchantId: objectIdSchema,
  eventType: eventTypeSchema.default("charge.settled"),
  actor: z.string().trim().min(2).max(120).default("system"),
});

export const listDeliveriesQuerySchema = z.object({
  merchantId: objectIdSchema,
  webhookId: objectIdSchema.optional(),
  status: deliveryStatusSchema.optional(),
  eventType: eventTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListDeveloperKeysQuery = z.infer<typeof listDeveloperKeysQuerySchema>;
export type CreateDeveloperKeyInput = z.infer<typeof createDeveloperKeySchema>;
export type DeveloperKeyActionInput = z.infer<typeof developerKeyActionSchema>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type WebhookActionInput = z.infer<typeof webhookActionSchema>;
export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
export type CreateTestDeliveryInput = z.infer<typeof createTestDeliverySchema>;
