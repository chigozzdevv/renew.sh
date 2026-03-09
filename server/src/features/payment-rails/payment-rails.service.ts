import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { ChargeModel } from "@/features/charges/charge.model";
import { emitChargeWebhookEventForStatusChange } from "@/features/developers/developer-webhook-delivery.service";
import { PaymentRailEventModel } from "@/features/payment-rails/payment-rail-event.model";
import { ChannelModel } from "@/features/payment-rails/channel.model";
import { NetworkModel } from "@/features/payment-rails/network.model";
import { SettlementModel } from "@/features/settlements/settlement.model";
import { queueSettlementBridge } from "@/features/settlements/settlement.service";
import type {
  CreateWidgetQuoteInput,
  ListChannelsQuery,
  ListNetworksQuery,
  ResolveBankAccountInput,
  SyncPaymentRailInput,
  YellowCardWebhookInput,
} from "@/features/payment-rails/payment-rails.validation";
import { getYellowCardProvider } from "@/features/payment-rails/providers/yellow-card/yellow-card.factory";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import {
  createRuntimeModeCondition,
  toStoredRuntimeMode,
} from "@/shared/utils/runtime-environment";

function toChannelResponse(document: {
  _id: { toString(): string };
  externalId: string;
  environment?: string;
  country: string;
  currency: string;
  countryCurrency: string;
  status: string;
  widgetStatus: string;
  apiStatus: string;
  channelType: string;
  rampType: string;
  settlementType: string;
  estimatedSettlementTime: number;
  min: number;
  max: number;
  widgetMin?: number | null;
  widgetMax?: number | null;
  feeLocal: number;
  feeUSD: number;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    externalId: document.externalId,
    environment: document.environment === "live" ? "live" : "test",
    country: document.country,
    currency: document.currency,
    countryCurrency: document.countryCurrency,
    status: document.status,
    widgetStatus: document.widgetStatus,
    apiStatus: document.apiStatus,
    channelType: document.channelType,
    rampType: document.rampType,
    settlementType: document.settlementType,
    estimatedSettlementTime: document.estimatedSettlementTime,
    min: document.min,
    max: document.max,
    widgetMin: document.widgetMin ?? null,
    widgetMax: document.widgetMax ?? null,
    feeLocal: document.feeLocal,
    feeUSD: document.feeUSD,
    lastSyncedAt: document.lastSyncedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toNetworkResponse(document: {
  _id: { toString(): string };
  externalId: string;
  environment?: string;
  code?: string | null;
  country: string;
  name: string;
  status: string;
  accountNumberType?: string | null;
  countryAccountNumberType?: string | null;
  channelIds: string[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    externalId: document.externalId,
    environment: document.environment === "live" ? "live" : "test",
    code: document.code ?? null,
    country: document.country,
    name: document.name,
    status: document.status,
    accountNumberType: document.accountNumberType ?? null,
    countryAccountNumberType: document.countryAccountNumberType ?? null,
    channelIds: document.channelIds,
    lastSyncedAt: document.lastSyncedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function listChannels(query: ListChannelsQuery) {
  const mongoQuery: Record<string, unknown> = {};

  if (query.environment) {
    Object.assign(mongoQuery, createRuntimeModeCondition("environment", query.environment));
  }

  if (query.country) {
    mongoQuery.country = query.country;
  }

  if (query.currency) {
    mongoQuery.currency = query.currency;
  }

  if (query.channelType) {
    mongoQuery.channelType = query.channelType;
  }

  if (query.rampType) {
    mongoQuery.rampType = query.rampType;
  }

  if (!query.includeInactive) {
    mongoQuery.status = "active";
    mongoQuery.widgetStatus = "active";
    mongoQuery.apiStatus = "active";
  }

  const channels = await ChannelModel.find(mongoQuery)
    .sort({ country: 1, currency: 1, channelType: 1 })
    .exec();

  return channels.map(toChannelResponse);
}

export async function listNetworks(query: ListNetworksQuery) {
  const mongoQuery: Record<string, unknown> = {};

  if (query.environment) {
    Object.assign(mongoQuery, createRuntimeModeCondition("environment", query.environment));
  }

  if (query.country) {
    mongoQuery.country = query.country;
  }

  if (!query.includeInactive) {
    mongoQuery.status = "active";
  }

  if (query.channelId) {
    mongoQuery.channelIds = query.channelId;
  }

  const networks = await NetworkModel.find(mongoQuery)
    .sort({ country: 1, name: 1 })
    .exec();

  return networks.map(toNetworkResponse);
}

export async function syncChannels(input: SyncPaymentRailInput) {
  const yellowCardProvider = getYellowCardProvider(input.environment);
  const channels = await yellowCardProvider.getChannels(input.country);

  const operations = channels.map((channel) =>
    ChannelModel.findOneAndUpdate(
      {
        externalId: channel.id,
        ...createRuntimeModeCondition("environment", input.environment),
      },
      {
        externalId: channel.id,
        environment: input.environment,
        country: channel.country,
        currency: channel.currency,
        countryCurrency: channel.countryCurrency,
        status: channel.status,
        widgetStatus: channel.widgetStatus ?? channel.status,
        apiStatus: channel.apiStatus ?? channel.status,
        channelType: channel.channelType,
        rampType: channel.rampType,
        settlementType: channel.settlementType ?? "standard",
        estimatedSettlementTime: channel.estimatedSettlementTime ?? 0,
        min: channel.min ?? 0,
        max: channel.max ?? 0,
        widgetMin: channel.widgetMin ?? null,
        widgetMax: channel.widgetMax ?? null,
        feeLocal: channel.feeLocal ?? 0,
        feeUSD: channel.feeUSD ?? 0,
        raw: channel,
        lastSyncedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
  );

  const synced = await Promise.all(operations);

  return synced.map(toChannelResponse);
}

export async function syncNetworks(input: SyncPaymentRailInput) {
  const yellowCardProvider = getYellowCardProvider(input.environment);
  const networks = await yellowCardProvider.getNetworks(input.country);

  const operations = networks.map((network) =>
    NetworkModel.findOneAndUpdate(
      {
        externalId: network.id,
        ...createRuntimeModeCondition("environment", input.environment),
      },
      {
        externalId: network.id,
        environment: input.environment,
        code: network.code ?? null,
        country: network.country,
        name: network.name,
        status: network.status,
        accountNumberType: network.accountNumberType ?? null,
        countryAccountNumberType: network.countryAccountNumberType ?? null,
        channelIds: network.channelIds ?? [],
        raw: network,
        lastSyncedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
  );

  const synced = await Promise.all(operations);

  return synced.map(toNetworkResponse);
}

export async function createWidgetQuote(input: CreateWidgetQuoteInput) {
  const yellowCardProvider = getYellowCardProvider(input.environment);
  const activeChannel = await ChannelModel.findOne({
    externalId: input.channelId,
    ...createRuntimeModeCondition("environment", input.environment),
    status: "active",
    widgetStatus: "active",
    apiStatus: "active",
  }).exec();

  if (!activeChannel) {
    throw new HttpError(
      404,
      "Active payment channel was not found for the requested quote."
    );
  }

  const quote = await yellowCardProvider.getWidgetQuote(input);

  return {
    ...quote,
    settlementAsset: "USDC",
    settlementNetwork: "AVALANCHE",
  };
}

export async function resolveBankAccount(input: ResolveBankAccountInput) {
  const yellowCardProvider = getYellowCardProvider(input.environment);
  const network = await NetworkModel.findOne({
    externalId: input.networkId,
    ...createRuntimeModeCondition("environment", input.environment),
    status: "active",
  }).exec();

  if (!network) {
    throw new HttpError(404, "Network was not found or is inactive.");
  }

  const result = await yellowCardProvider.resolveBankAccount(input);

  return {
    ...result,
    networkName: network.name,
  };
}

export async function enqueuePaymentRailSync(input: SyncPaymentRailInput) {
  const queuedJob = await enqueueQueueJob(
    queueNames.paymentRailSync,
    "sync-payment-rails",
    input,
    {
      jobId: `payment-rail-sync:${input.environment}:${input.country ?? "all"}:${Math.floor(
        Date.now() / 60000
      )}`,
    }
  );

  if (!queuedJob) {
    const inlineResult = await runPaymentRailSyncJob(input);

    return {
      queued: false,
      processedInline: true,
      scope: input.country ?? "all",
      result: inlineResult,
    };
  }

  return {
    queued: true,
    scope: input.country ?? "all",
  };
}

export async function runPaymentRailSyncJob(input: SyncPaymentRailInput) {
  const [channels, networks] = await Promise.all([
    syncChannels(input),
    syncNetworks(input),
  ]);

  return {
    channels: channels.length,
    networks: networks.length,
    scope: input.country ?? "all",
  };
}

export async function getPreferredCollectionChannel(
  currency: string,
  environment: RuntimeMode = "test"
) {
  const channel = await ChannelModel.findOne({
    ...createRuntimeModeCondition("environment", environment),
    currency,
    status: "active",
    widgetStatus: "active",
    apiStatus: "active",
  })
    .sort({ estimatedSettlementTime: 1, feeUSD: 1 })
    .exec();

  if (!channel) {
    throw new HttpError(
      404,
      `No active payment rail was found for currency ${currency}.`
    );
  }

  return channel;
}

export async function getPreferredCollectionNetwork(
  channelId: string,
  country?: string,
  environment: RuntimeMode = "test"
) {
  const mongoQuery: Record<string, unknown> = {
    ...createRuntimeModeCondition("environment", environment),
    status: "active",
    channelIds: channelId,
  };

  if (country) {
    mongoQuery.country = country;
  }

  const network = await NetworkModel.findOne(mongoQuery).sort({ name: 1 }).exec();

  return network;
}

export async function createCollectionRequest(input: {
  merchantId: string;
  environment: RuntimeMode;
  channelId: string;
  customerRef: string;
  customerName: string;
  localAmount: number;
  usdAmount: number;
  currency: string;
  country?: string;
  networkId?: string | null;
  accountType: "bank" | "momo";
  accountNumber?: string | null;
}) {
  const yellowCardProvider = getYellowCardProvider(input.environment);
  const sequenceId = `renew-${input.customerRef}-${Date.now()}`;

  return yellowCardProvider.submitCollectionRequest({
    channelId: input.channelId,
    sequenceId,
    amount: Number(input.usdAmount.toFixed(2)),
    localAmount: Math.round(input.localAmount),
    currency: input.currency,
    country: input.country,
    customerUID: input.customerRef,
    customerType: "institution",
    recipient: {
      businessId: input.customerRef,
      businessName: input.customerName,
    },
    source: {
      accountType: input.accountType,
      ...(input.accountNumber ? { accountNumber: input.accountNumber } : {}),
      ...(input.networkId ? { networkId: input.networkId } : {}),
    },
    forceAccept: true,
  });
}

export async function getCollectionRequest(
  collectionId: string,
  environment: RuntimeMode = "test"
) {
  const yellowCardProvider = getYellowCardProvider(environment);
  return yellowCardProvider.getCollectionById(collectionId);
}

export async function acceptCollectionRequest(
  collectionId: string,
  environment: RuntimeMode = "test"
) {
  const yellowCardProvider = getYellowCardProvider(environment);
  return yellowCardProvider.acceptCollectionRequest(collectionId);
}

export async function denyCollectionRequest(
  collectionId: string,
  environment: RuntimeMode = "test"
) {
  const yellowCardProvider = getYellowCardProvider(environment);
  return yellowCardProvider.denyCollectionRequest(collectionId);
}

function readWebhookValue<T = unknown>(
  payload: YellowCardWebhookInput,
  key: string
): T | undefined {
  const primary = payload[key as keyof YellowCardWebhookInput];

  if (primary !== undefined) {
    return primary as T;
  }

  const dataValue = payload.data?.[key];

  if (dataValue !== undefined) {
    return dataValue as T;
  }

  const nestedPayloadValue = payload.payload?.[key];

  if (nestedPayloadValue !== undefined) {
    return nestedPayloadValue as T;
  }

  const collectionValue = payload.collection?.[key];

  if (collectionValue !== undefined) {
    return collectionValue as T;
  }

  return undefined;
}

function normalizeWebhookState(payload: YellowCardWebhookInput) {
  const value =
    readWebhookValue<string>(payload, "state") ??
    readWebhookValue<string>(payload, "event") ??
    readWebhookValue<string>(payload, "status");

  return value?.trim().toLowerCase() ?? "unknown";
}

function buildWebhookEventKey(
  payload: YellowCardWebhookInput,
  state: string,
  environment: RuntimeMode
) {
  const sequenceId = readWebhookValue<string>(payload, "sequenceId") ?? "none";
  const externalId = readWebhookValue<string>(payload, "id") ?? "none";
  const event = readWebhookValue<string>(payload, "event") ?? "none";
  const status = readWebhookValue<string>(payload, "status") ?? "none";
  const timestamp =
    readWebhookValue<string>(payload, "updatedAt") ??
    readWebhookValue<string>(payload, "createdAt") ??
    "none";

  return `yellow-card:${environment}:${sequenceId}:${externalId}:${state}:${event}:${status}:${timestamp}`;
}

export async function processYellowCardWebhook(
  input: YellowCardWebhookInput,
  environmentHint?: RuntimeMode
) {
  const environment =
    environmentHint ??
    optionalEnvironmentFromPayload(input) ??
    "test";
  const state = normalizeWebhookState(input);
  const eventKey = buildWebhookEventKey(input, state, environment);
  const existingEvent = await PaymentRailEventModel.findOne({
    provider: "yellow-card",
    environment,
    eventKey,
  }).exec();

  if (existingEvent && existingEvent.processedAt) {
    return {
      processed: true,
      idempotent: true,
      matched: Boolean(existingEvent.result),
      state,
      externalChargeId:
        readWebhookValue<string>(input, "sequenceId") ??
        readWebhookValue<string>(input, "id") ??
        null,
    };
  }

  let webhookEvent = existingEvent;

  if (!webhookEvent) {
    try {
      webhookEvent = await PaymentRailEventModel.create({
        provider: "yellow-card",
        environment,
        eventKey,
        state,
        externalId: readWebhookValue<string>(input, "id") ?? null,
        sequenceId: readWebhookValue<string>(input, "sequenceId") ?? null,
        payload: input,
      });
    } catch (error) {
      const duplicateKeyError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        Number((error as { code?: number }).code) === 11000;

      if (!duplicateKeyError) {
        throw error;
      }

      const duplicateEvent = await PaymentRailEventModel.findOne({
        provider: "yellow-card",
        environment,
        eventKey,
      }).exec();

      return {
        processed: true,
        idempotent: true,
        matched: Boolean(duplicateEvent?.result),
        state,
        externalChargeId:
          readWebhookValue<string>(input, "sequenceId") ??
          readWebhookValue<string>(input, "id") ??
          null,
      };
    }
  }

  const sequenceId = readWebhookValue<string>(input, "sequenceId");
  const externalId = readWebhookValue<string>(input, "id");
  const charge =
    (sequenceId
      ? await ChargeModel.findOne({
          externalChargeId: sequenceId,
          ...createRuntimeModeCondition("environment", environment),
        }).exec()
      : null) ??
    (externalId
      ? await ChargeModel.findOne({
          externalChargeId: externalId,
          ...createRuntimeModeCondition("environment", environment),
        }).exec()
      : null);

  if (!charge) {
    if (webhookEvent) {
      webhookEvent.result = {
        processed: false,
        matched: false,
        state,
        externalChargeId: sequenceId ?? externalId ?? null,
      };
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();
    }

    return {
      processed: false,
      idempotent: false,
      matched: false,
      state,
      externalChargeId: sequenceId ?? externalId ?? null,
    };
  }

  const linkedSettlement = await SettlementModel.findOne({
    sourceChargeId: charge._id,
    ...createRuntimeModeCondition(
      "environment",
      toStoredRuntimeMode(charge.environment)
    ),
  })
    .sort({ createdAt: -1 })
    .exec();

  const now = new Date();
  const previousChargeStatus = charge.status;
  let nextChargeStatus = charge.status;
  let nextFailureCode = charge.failureCode ?? null;

  if (
    state.includes("failed") ||
    state.includes("deny") ||
    state.includes("cancel") ||
    state.includes("expired")
  ) {
    nextChargeStatus = "failed";
    nextFailureCode = state;

    if (linkedSettlement && linkedSettlement.status !== "settled") {
      linkedSettlement.status = "failed";
      linkedSettlement.settledAt = null;
      await linkedSettlement.save();
    }
  } else if (
    state.includes("complete") ||
    state.includes("accept") ||
    state.includes("success")
  ) {
    nextChargeStatus = linkedSettlement ? "awaiting_settlement" : "settled";
    nextFailureCode = null;

    if (linkedSettlement) {
      await queueSettlementBridge(linkedSettlement._id.toString(), {
        merchantId: linkedSettlement.merchantId.toString(),
        environment,
      });
    }
  } else if (
    state.includes("processing") ||
    state.includes("pending") ||
    state.includes("created")
  ) {
    if (charge.status !== "settled") {
      nextChargeStatus = "pending";
      nextFailureCode = null;
    }
  }

  charge.status = nextChargeStatus;
  charge.failureCode = nextFailureCode;
  charge.processedAt = now;
  await charge.save();
  await emitChargeWebhookEventForStatusChange({
    previousStatus: previousChargeStatus,
    chargeId: charge._id.toString(),
    nextStatus: charge.status,
  });

  const result = {
    processed: true,
    idempotent: false,
    matched: true,
    state,
    chargeId: charge._id.toString(),
    chargeStatus: charge.status,
    settlementId: linkedSettlement?._id.toString() ?? null,
    settlementStatus: linkedSettlement?.status ?? null,
  };

  if (webhookEvent) {
    webhookEvent.result = result;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
  }

  return result;
}

function optionalEnvironmentFromPayload(
  payload: YellowCardWebhookInput
): RuntimeMode | null {
  const rawEnvironment = readWebhookValue<string>(payload, "environment");

  if (rawEnvironment === "live") {
    return "live";
  }

  if (rawEnvironment === "test") {
    return "test";
  }

  return null;
}
