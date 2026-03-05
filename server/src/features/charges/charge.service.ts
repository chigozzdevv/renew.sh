import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { ChargeModel } from "@/features/charges/charge.model";
import { createSettlement, queueSettlementSweep } from "@/features/settlements/settlement.service";
import type {
  CreateChargeInput,
  ListChargesQuery,
  UpdateChargeInput,
} from "@/features/charges/charge.validation";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { getPreferredCollectionChannel, getPreferredCollectionNetwork, createCollectionRequest, createWidgetQuote } from "@/features/payment-rails/payment-rails.service";
import { PlanModel } from "@/features/plans/plan.model";
import { SubscriptionModel } from "@/features/subscriptions/subscription.model";

function toChargeResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  subscriptionId: { toString(): string };
  externalChargeId: string;
  settlementSource?: string | null;
  localAmount: number;
  fxRate: number;
  usdcAmount: number;
  feeAmount: number;
  status: string;
  failureCode?: string | null;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    subscriptionId: document.subscriptionId.toString(),
    externalChargeId: document.externalChargeId,
    settlementSource: document.settlementSource ?? null,
    localAmount: document.localAmount,
    fxRate: document.fxRate,
    usdcAmount: document.usdcAmount,
    feeAmount: document.feeAmount,
    status: document.status,
    failureCode: document.failureCode ?? null,
    processedAt: document.processedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toSafeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildFallbackAccountNumber(customerRef: string) {
  const digits = customerRef.replace(/\D/g, "");

  return (digits || "1000000000").padStart(10, "0").slice(-10);
}

function deriveAccountType(
  explicitType: string | undefined,
  channelType: string
): "bank" | "momo" {
  if (explicitType === "momo") {
    return "momo";
  }

  if (explicitType === "bank") {
    return "bank";
  }

  return channelType.toLowerCase().includes("momo") ? "momo" : "bank";
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function ensureChargeScope(chargeId: string, merchantId?: string) {
  const charge = await ChargeModel.findById(chargeId).exec();

  if (!charge) {
    throw new HttpError(404, "Charge was not found.");
  }

  if (merchantId && charge.merchantId.toString() !== merchantId) {
    throw new HttpError(403, "Charge does not belong to this merchant.");
  }

  return charge;
}

export async function createCharge(input: CreateChargeInput) {
  const [merchantExists, subscriptionExists] = await Promise.all([
    MerchantModel.exists({ _id: input.merchantId }),
    SubscriptionModel.exists({ _id: input.subscriptionId }),
  ]);

  if (!merchantExists) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (!subscriptionExists) {
    throw new HttpError(404, "Subscription was not found.");
  }

  const charge = await ChargeModel.create({
    merchantId: input.merchantId,
    subscriptionId: input.subscriptionId,
    externalChargeId: input.externalChargeId,
    settlementSource: input.settlementSource?.toLowerCase() ?? null,
    localAmount: input.localAmount,
    fxRate: input.fxRate,
    usdcAmount: input.usdcAmount,
    feeAmount: input.feeAmount,
    status: input.status,
    failureCode: input.failureCode ?? null,
    processedAt: input.processedAt ?? new Date(),
  });

  return toChargeResponse(charge);
}

export async function listCharges(query: ListChargesQuery) {
  const mongoQuery: Record<string, unknown> = {};

  if (query.merchantId) {
    mongoQuery.merchantId = query.merchantId;
  }

  if (query.subscriptionId) {
    mongoQuery.subscriptionId = query.subscriptionId;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    mongoQuery.externalChargeId = pattern;
  }

  const charges = await ChargeModel.find(mongoQuery)
    .sort({ processedAt: -1 })
    .exec();

  return charges.map(toChargeResponse);
}

export async function getChargeById(chargeId: string, merchantId?: string) {
  const charge = await ensureChargeScope(chargeId, merchantId);

  return toChargeResponse(charge);
}

export async function updateCharge(
  chargeId: string,
  input: UpdateChargeInput,
  merchantId?: string
) {
  const charge = await ensureChargeScope(chargeId, merchantId);

  if (input.status !== undefined) {
    charge.status = input.status;
  }

  if (input.failureCode !== undefined) {
    charge.failureCode = input.failureCode ?? null;
  }

  if (input.processedAt !== undefined) {
    charge.processedAt = input.processedAt;
  }

  await charge.save();

  return toChargeResponse(charge);
}

export async function queueChargeRetry(chargeId: string, merchantId?: string) {
  const charge = await ensureChargeScope(chargeId, merchantId);

  if (charge.status === "settled") {
    throw new HttpError(409, "Settled charges cannot be retried.");
  }

  const result = await enqueueQueueJob(
    queueNames.subscriptionCharge,
    "subscription-charge-retry",
    { subscriptionId: charge.subscriptionId.toString() },
    {
      attempts: 5,
      jobId: `subscription-charge-retry:${charge.subscriptionId.toString()}:${Date.now()}`,
    }
  );

  if (!result) {
    const inlineResult = await runSubscriptionChargeJob({
      subscriptionId: charge.subscriptionId.toString(),
    });

    return {
      queued: false,
      processedInline: true,
      chargeId,
      result: inlineResult,
    };
  }

  return {
    queued: true,
    chargeId,
  };
}

export async function runSubscriptionChargeJob(input: { subscriptionId: string }) {
  const subscription = await SubscriptionModel.findById(input.subscriptionId).exec();

  if (!subscription) {
    throw new HttpError(404, "Subscription was not found.");
  }

  const [merchant, plan] = await Promise.all([
    MerchantModel.findById(subscription.merchantId).exec(),
    PlanModel.findById(subscription.planId).exec(),
  ]);

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  if (merchant.status !== "active") {
    throw new HttpError(409, "Merchant is not active.");
  }

  if (plan.status !== "active") {
    throw new HttpError(409, "Plan is not active.");
  }

  if (subscription.status === "paused" || subscription.status === "cancelled") {
    return {
      skipped: true,
      reason: `Subscription is ${subscription.status}.`,
      subscriptionId: subscription._id.toString(),
    };
  }

  const now = new Date();

  if (subscription.nextChargeAt > now && !subscription.retryAvailableAt) {
    return {
      skipped: true,
      reason: "Subscription is not due yet.",
      subscriptionId: subscription._id.toString(),
      nextChargeAt: subscription.nextChargeAt,
    };
  }

  if (subscription.retryAvailableAt && subscription.retryAvailableAt > now) {
    return {
      skipped: true,
      reason: "Retry window has not opened yet.",
      subscriptionId: subscription._id.toString(),
      retryAvailableAt: subscription.retryAvailableAt,
    };
  }

  const channel = await getPreferredCollectionChannel(subscription.billingCurrency);
  const network =
    subscription.paymentNetworkId
      ? await getPreferredCollectionNetwork(
          channel.externalId,
          channel.country
        ).catch(() => null)
      : await getPreferredCollectionNetwork(channel.externalId, channel.country);

  const quote = (await createWidgetQuote({
    currency: subscription.billingCurrency,
    cryptoAmount: plan.usdAmount,
    channelId: channel.externalId,
    coin: "USDC",
    network: "AVALANCHE",
    transactionType: "Buy",
  })) as Record<string, unknown>;

  const localAmount = toSafeNumber(
    quote.convertedAmount,
    subscription.localAmount
  );
  const usdcAmount = Number(
    Math.max(0.01, toSafeNumber(quote.cryptoAmount, plan.usdAmount)).toFixed(4)
  );
  const fxRate = Number(
    Math.max(
      0.0001,
      toSafeNumber(
        quote.rateLocal,
        localAmount > 0 ? localAmount / usdcAmount : subscription.localAmount
      )
    ).toFixed(4)
  );
  const feeAmount = Number(
    (
      toSafeNumber(quote.serviceFeeUSD) + toSafeNumber(quote.partnerFeeUSD)
    ).toFixed(2)
  );
  const netUsdc = Number(Math.max(0.01, usdcAmount - feeAmount).toFixed(2));

  const collection = (await createCollectionRequest({
    channelId: channel.externalId,
    customerRef: subscription.customerRef,
    customerName: subscription.customerName,
    localAmount,
    usdAmount: usdcAmount,
    currency: subscription.billingCurrency,
    country: channel.country,
    networkId:
      subscription.paymentNetworkId ?? network?.externalId ?? null,
    accountType: deriveAccountType(
      subscription.paymentAccountType,
      channel.channelType
    ),
    accountNumber:
      subscription.paymentAccountNumber ??
      buildFallbackAccountNumber(subscription.customerRef),
  })) as Record<string, unknown>;

  const collectionStatus = String(collection.status ?? "processing").toLowerCase();
  const externalChargeId = String(
    collection.sequenceId ?? collection.id ?? `renew-charge-${Date.now()}`
  );

  if (collectionStatus === "failed") {
    const failedCharge = await ChargeModel.create({
      merchantId: merchant._id,
      subscriptionId: subscription._id,
      externalChargeId,
      settlementSource: merchant.merchantAccount,
      localAmount,
      fxRate,
      usdcAmount,
      feeAmount,
      status: "failed",
      failureCode: "collection_failed",
      processedAt: now,
    });

    subscription.status = "past_due";
    subscription.retryAvailableAt = new Date(
      now.getTime() + plan.retryWindowHours * 60 * 60 * 1000
    );
    await subscription.save();

    return {
      subscriptionId: subscription._id.toString(),
      chargeId: failedCharge._id.toString(),
      status: "failed",
      retryAvailableAt: subscription.retryAvailableAt,
    };
  }

  const charge = await ChargeModel.create({
    merchantId: merchant._id,
    subscriptionId: subscription._id,
    externalChargeId,
    settlementSource: merchant.merchantAccount,
    localAmount,
    fxRate,
    usdcAmount,
    feeAmount,
    status: "pending",
    failureCode: null,
    processedAt: now,
  });

  const settlement = await createSettlement({
    merchantId: merchant._id.toString(),
    sourceChargeId: charge._id.toString(),
    batchRef: `settlement-${externalChargeId}`,
    grossUsdc: Number(usdcAmount.toFixed(2)),
    feeUsdc: feeAmount,
    netUsdc,
    destinationWallet: merchant.payoutWallet,
    status: "queued",
    scheduledFor: new Date(now.getTime() + 5 * 60 * 1000),
  });

  subscription.status = "active";
  subscription.localAmount = localAmount;
  subscription.lastChargeAt = now;
  subscription.retryAvailableAt = null;
  subscription.nextChargeAt = addDays(now, plan.billingIntervalDays);
  await subscription.save();

  const settlementDispatch = await queueSettlementSweep(settlement.id);

  return {
    subscriptionId: subscription._id.toString(),
    chargeId: charge._id.toString(),
    settlementId: settlement.id,
    collectionStatus,
    settlementDispatch,
  };
}
