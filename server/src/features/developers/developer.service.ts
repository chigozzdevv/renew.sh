import { createHash, randomBytes } from "crypto";

import { getSafeConfig } from "@/config/safe.config";
import { getSumsubConfig } from "@/config/sumsub.config";
import { getYellowCardConfig } from "@/config/yellow-card.config";
import { HttpError } from "@/shared/errors/http-error";

import { appendAuditLog } from "@/features/audit/audit.service";
import { DeveloperDeliveryModel } from "@/features/developers/developer-delivery.model";
import { DeveloperKeyModel } from "@/features/developers/developer-key.model";
import { DeveloperWebhookModel } from "@/features/developers/developer-webhook.model";
import type {
  CreateDeveloperKeyInput,
  CreateTestDeliveryInput,
  CreateWebhookInput,
  DeveloperKeyActionInput,
  ListDeliveriesQuery,
  ListDeveloperKeysQuery,
  ListWebhooksQuery,
  UpdateWebhookInput,
  WebhookActionInput,
} from "@/features/developers/developer.validation";
import { MerchantModel } from "@/features/merchants/merchant.model";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

type IntegrationModeStatus = {
  mode: RuntimeMode;
  implementation: string;
  state: "ready" | "simulated" | "credentials_pending";
  detail: string;
};

type IntegrationStatusRecord = {
  key: "safe" | "yellow_card" | "sumsub";
  label: string;
  modes: IntegrationModeStatus[];
};

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createApiKeyToken(environment: "test" | "live") {
  const suffix = randomBytes(24).toString("hex");
  const prefix = environment === "live" ? "rk_live" : "rk_test";
  const token = `${prefix}_${suffix}`;

  return {
    prefix,
    token,
    hash: hashSecret(token),
    lastFour: token.slice(-4),
  };
}

function createWebhookSecret() {
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  return {
    secret,
    hash: hashSecret(secret),
  };
}

function toDeveloperKeyResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  label: string;
  environment: string;
  prefix: string;
  lastFour: string;
  status: string;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    label: document.label,
    environment: document.environment,
    maskedToken: `${document.prefix}••••${document.lastFour}`,
    status: document.status,
    lastUsedAt: document.lastUsedAt ?? null,
    revokedAt: document.revokedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toWebhookResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  label: string;
  endpointUrl: string;
  status: string;
  eventTypes: string[];
  retryPolicy: string;
  lastDeliveryAt?: Date | null;
  disabledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    label: document.label,
    endpointUrl: document.endpointUrl,
    status: document.status,
    eventTypes: document.eventTypes,
    retryPolicy: document.retryPolicy,
    lastDeliveryAt: document.lastDeliveryAt ?? null,
    disabledAt: document.disabledAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toDeliveryResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  webhookId: { toString(): string };
  eventType: string;
  status: string;
  httpStatus?: number | null;
  attempts: number;
  payload?: Record<string, unknown>;
  errorMessage?: string | null;
  deliveredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    webhookId: document.webhookId.toString(),
    eventType: document.eventType,
    status: document.status,
    httpStatus: document.httpStatus ?? null,
    attempts: document.attempts,
    payload: document.payload ?? {},
    errorMessage: document.errorMessage ?? null,
    deliveredAt: document.deliveredAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ensureMerchant(merchantId: string) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  return merchant;
}

function hasConfiguredAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "0x0000000000000000000000000000000000000000";
}

function resolveSafeModeStatus(mode: RuntimeMode): IntegrationModeStatus {
  const config = getSafeConfig(mode);
  const isReady =
    config.rpcUrl.trim().length > 0 &&
    config.txServiceUrl.trim().length > 0 &&
    config.executorPrivateKey.trim().length > 0 &&
    hasConfiguredAddress(config.protocolAddress);

  return {
    mode,
    implementation: mode === "live" ? "live" : "testnet",
    state: isReady ? "ready" : "credentials_pending",
    detail: isReady
      ? mode === "live"
        ? "Mainnet Safe treasury is configured."
        : "Fuji Safe treasury is configured."
      : "Safe RPC, transaction service, executor key, or protocol address is missing.",
  };
}

function resolveYellowCardModeStatus(mode: RuntimeMode): IntegrationModeStatus {
  if (mode === "test") {
    return {
      mode,
      implementation: "simulated",
      state: "simulated",
      detail: "Fiat collection is simulated in the MVP runtime.",
    };
  }

  const config = getYellowCardConfig(mode);
  const isReady = config.apiKey.length > 0;

  return {
    mode,
    implementation: "live",
    state: isReady ? "ready" : "credentials_pending",
    detail: isReady
      ? "Live Yellow Card credentials are configured."
      : "Waiting for Yellow Card live credentials.",
  };
}

function resolveSumsubModeStatus(mode: RuntimeMode): IntegrationModeStatus {
  if (mode === "test") {
    return {
      mode,
      implementation: "simulated",
      state: "simulated",
      detail: "KYB/KYC is simulated in the MVP runtime.",
    };
  }

  const config = getSumsubConfig(mode);
  const isReady = config.appToken.length > 0 && config.secretKey.length > 0;

  return {
    mode,
    implementation: "live",
    state: isReady ? "ready" : "credentials_pending",
    detail: isReady
      ? "Live Sumsub credentials are configured."
      : "Waiting for Sumsub live credentials.",
  };
}

async function ensureDeveloperKey(developerKeyId: string, merchantId: string) {
  const key = await DeveloperKeyModel.findOne({
    _id: developerKeyId,
    merchantId,
  }).exec();

  if (!key) {
    throw new HttpError(404, "Developer key was not found.");
  }

  return key;
}

async function ensureWebhook(webhookId: string, merchantId: string) {
  const webhook = await DeveloperWebhookModel.findOne({
    _id: webhookId,
    merchantId,
  }).exec();

  if (!webhook) {
    throw new HttpError(404, "Webhook endpoint was not found.");
  }

  return webhook;
}

export async function listDeveloperKeys(query: ListDeveloperKeysQuery) {
  await ensureMerchant(query.merchantId);

  const mongoQuery: Record<string, unknown> = {
    merchantId: query.merchantId,
  };

  if (query.environment) {
    mongoQuery.environment = query.environment;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  const keys = await DeveloperKeyModel.find(mongoQuery)
    .sort({ createdAt: -1 })
    .exec();

  return keys.map(toDeveloperKeyResponse);
}

export async function getDeveloperIntegrationStatus(merchantId: string) {
  const merchant = await ensureMerchant(merchantId);

  return {
    workspaceMode: merchant.environmentMode === "live" ? "live" : "test",
    providers: [
      {
        key: "safe",
        label: "Safe treasury",
        modes: [resolveSafeModeStatus("test"), resolveSafeModeStatus("live")],
      },
      {
        key: "yellow_card",
        label: "Yellow Card",
        modes: [
          resolveYellowCardModeStatus("test"),
          resolveYellowCardModeStatus("live"),
        ],
      },
      {
        key: "sumsub",
        label: "Sumsub",
        modes: [resolveSumsubModeStatus("test"), resolveSumsubModeStatus("live")],
      },
    ] satisfies IntegrationStatusRecord[],
  };
}

export async function createDeveloperKey(input: CreateDeveloperKeyInput) {
  await ensureMerchant(input.merchantId);

  const token = createApiKeyToken(input.environment);
  const key = await DeveloperKeyModel.create({
    merchantId: input.merchantId,
    label: input.label,
    environment: input.environment,
    prefix: token.prefix,
    tokenHash: token.hash,
    lastFour: token.lastFour,
    status: "active",
    lastUsedAt: null,
    revokedAt: null,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Created API key",
    category: "developer",
    status: "ok",
    target: input.label,
    detail: `API key ${input.label} created for ${input.environment} environment.`,
    metadata: {
      keyId: key._id.toString(),
      environment: input.environment,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    key: toDeveloperKeyResponse(key),
    token: token.token,
  };
}

export async function revokeDeveloperKey(
  developerKeyId: string,
  input: DeveloperKeyActionInput
) {
  await ensureMerchant(input.merchantId);
  const key = await ensureDeveloperKey(developerKeyId, input.merchantId);

  if (key.status === "revoked") {
    return toDeveloperKeyResponse(key);
  }

  key.status = "revoked";
  key.revokedAt = new Date();
  await key.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Revoked API key",
    category: "developer",
    status: "warning",
    target: key.label,
    detail: `API key ${key.label} was revoked.`,
    metadata: {
      keyId: key._id.toString(),
      environment: key.environment,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toDeveloperKeyResponse(key);
}

export async function listWebhooks(query: ListWebhooksQuery) {
  await ensureMerchant(query.merchantId);

  const mongoQuery: Record<string, unknown> = {
    merchantId: query.merchantId,
  };

  if (query.status) {
    mongoQuery.status = query.status;
  }

  const webhooks = await DeveloperWebhookModel.find(mongoQuery)
    .sort({ createdAt: -1 })
    .exec();

  return webhooks.map(toWebhookResponse);
}

export async function createWebhook(input: CreateWebhookInput) {
  await ensureMerchant(input.merchantId);
  const secret = createWebhookSecret();

  const webhook = await DeveloperWebhookModel.create({
    merchantId: input.merchantId,
    label: input.label,
    endpointUrl: input.endpointUrl,
    eventTypes: input.eventTypes,
    retryPolicy: input.retryPolicy,
    status: "active",
    secretHash: secret.hash,
    lastDeliveryAt: null,
    disabledAt: null,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Created webhook",
    category: "developer",
    status: "ok",
    target: input.endpointUrl,
    detail: `Webhook ${input.label} created.`,
    metadata: {
      webhookId: webhook._id.toString(),
      events: input.eventTypes,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    webhook: toWebhookResponse(webhook),
    secret: secret.secret,
  };
}

export async function updateWebhook(
  webhookId: string,
  merchantId: string,
  input: UpdateWebhookInput
) {
  await ensureMerchant(merchantId);
  const webhook = await ensureWebhook(webhookId, merchantId);

  if (input.label !== undefined) {
    webhook.label = input.label;
  }

  if (input.endpointUrl !== undefined) {
    webhook.endpointUrl = input.endpointUrl;
  }

  if (input.eventTypes !== undefined) {
    webhook.eventTypes = input.eventTypes;
  }

  if (input.retryPolicy !== undefined) {
    webhook.retryPolicy = input.retryPolicy;
  }

  if (input.status !== undefined) {
    webhook.status = input.status;
    webhook.disabledAt = input.status === "disabled" ? new Date() : null;
  }

  await webhook.save();

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Updated webhook",
    category: "developer",
    status: "ok",
    target: webhook.endpointUrl,
    detail: `Webhook ${webhook.label} was updated.`,
    metadata: {
      webhookId: webhook._id.toString(),
      status: webhook.status,
      retryPolicy: webhook.retryPolicy,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toWebhookResponse(webhook);
}

export async function rotateWebhookSecret(
  webhookId: string,
  input: WebhookActionInput
) {
  await ensureMerchant(input.merchantId);
  const webhook = await ensureWebhook(webhookId, input.merchantId);
  const secret = createWebhookSecret();

  webhook.secretHash = secret.hash;
  await webhook.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Rotated webhook secret",
    category: "security",
    status: "warning",
    target: webhook.endpointUrl,
    detail: `Webhook secret rotated for ${webhook.label}.`,
    metadata: {
      webhookId: webhook._id.toString(),
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    webhook: toWebhookResponse(webhook),
    secret: secret.secret,
  };
}

export async function listDeliveries(query: ListDeliveriesQuery) {
  await ensureMerchant(query.merchantId);

  const mongoQuery: Record<string, unknown> = {
    merchantId: query.merchantId,
  };

  if (query.webhookId) {
    mongoQuery.webhookId = query.webhookId;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.eventType) {
    mongoQuery.eventType = query.eventType;
  }

  const deliveries = await DeveloperDeliveryModel.find(mongoQuery)
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .exec();

  return deliveries.map(toDeliveryResponse);
}

export async function createTestDelivery(
  webhookId: string,
  input: CreateTestDeliveryInput
) {
  await ensureMerchant(input.merchantId);
  const webhook = await ensureWebhook(webhookId, input.merchantId);

  if (webhook.status !== "active") {
    throw new HttpError(409, "Webhook must be active to send a test delivery.");
  }

  const payload = {
    id: `evt_${randomBytes(8).toString("hex")}`,
    eventType: input.eventType,
    merchantId: input.merchantId,
    generatedAt: new Date().toISOString(),
  };

  const delivery = await DeveloperDeliveryModel.create({
    merchantId: input.merchantId,
    webhookId: webhook._id,
    eventType: input.eventType,
    status: "delivered",
    attempts: 1,
    httpStatus: 200,
    payload,
    errorMessage: null,
    deliveredAt: new Date(),
  });

  webhook.lastDeliveryAt = delivery.deliveredAt;
  await webhook.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Sent webhook test event",
    category: "developer",
    status: "ok",
    target: webhook.endpointUrl,
    detail: `Test delivery sent to ${webhook.label}.`,
    metadata: {
      webhookId: webhook._id.toString(),
      deliveryId: delivery._id.toString(),
      eventType: input.eventType,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toDeliveryResponse(delivery);
}
