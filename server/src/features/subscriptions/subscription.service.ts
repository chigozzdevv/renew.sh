import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { runSubscriptionChargeJob } from "@/features/charges/charge.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { quoteUsdAmountInBillingCurrency } from "@/features/payment-rails/payment-rails.service";
import { PlanModel } from "@/features/plans/plan.model";
import { SubscriptionModel } from "@/features/subscriptions/subscription.model";
import type {
  CreateSubscriptionInput,
  ListSubscriptionsQuery,
  UpdateSubscriptionInput,
} from "@/features/subscriptions/subscription.validation";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import { createRuntimeModeCondition } from "@/shared/utils/runtime-environment";

function toSubscriptionResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  planId: { toString(): string };
  customerRef: string;
  customerName: string;
  billingCurrency: string;
  localAmount: number;
  paymentAccountType: string;
  paymentAccountNumber?: string | null;
  paymentNetworkId?: string | null;
  status: string;
  nextChargeAt: Date;
  lastChargeAt?: Date | null;
  retryAvailableAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    planId: document.planId.toString(),
    customerRef: document.customerRef,
    customerName: document.customerName,
    billingCurrency: document.billingCurrency,
    localAmount: document.localAmount,
    paymentAccountType: document.paymentAccountType,
    paymentAccountNumber: document.paymentAccountNumber ?? null,
    paymentNetworkId: document.paymentNetworkId ?? null,
    status: document.status,
    nextChargeAt: document.nextChargeAt,
    lastChargeAt: document.lastChargeAt ?? null,
    retryAvailableAt: document.retryAvailableAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ensureSubscriptionScope(
  subscriptionId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const mongoQuery: Record<string, unknown> = {
    _id: subscriptionId,
  };

  if (merchantId) {
    mongoQuery.merchantId = merchantId;
  }

  if (environment) {
    Object.assign(mongoQuery, createRuntimeModeCondition("environment", environment));
  }

  const subscription = await SubscriptionModel.findOne(mongoQuery).exec();

  if (!subscription) {
    throw new HttpError(404, "Subscription was not found.");
  }

  return subscription;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const [merchant, plan] = await Promise.all([
    MerchantModel.findById(input.merchantId).exec(),
    PlanModel.findOne({
      _id: input.planId,
      merchantId: input.merchantId,
      ...createRuntimeModeCondition("environment", input.environment),
    }).exec(),
  ]);

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  if (!merchant.supportedMarkets.includes(input.billingCurrency)) {
    throw new HttpError(
      409,
      `Currency ${input.billingCurrency} is not enabled for this merchant.`
    );
  }

  if (!plan.supportedMarkets.includes(input.billingCurrency)) {
    throw new HttpError(
      409,
      `Currency ${input.billingCurrency} is not enabled for this plan.`
    );
  }

  const quote = await quoteUsdAmountInBillingCurrency({
    environment: input.environment,
    currency: input.billingCurrency,
    usdAmount: plan.usdAmount,
  });

  const createdSubscription = await SubscriptionModel.create({
    merchantId: input.merchantId,
    environment: input.environment,
    planId: input.planId,
    customerRef: input.customerRef,
    customerName: input.customerName,
    billingCurrency: input.billingCurrency,
    localAmount: quote.localAmount,
    paymentAccountType: input.paymentAccountType,
    paymentAccountNumber: input.paymentAccountNumber ?? null,
    paymentNetworkId: input.paymentNetworkId ?? null,
    status: input.status,
    nextChargeAt: input.nextChargeAt,
  });

  return toSubscriptionResponse(createdSubscription);
}

export async function listSubscriptions(query: ListSubscriptionsQuery) {
  const filters: Record<string, unknown>[] = [];

  if (query.merchantId) {
    filters.push({
      merchantId: query.merchantId,
    });
  }

  if (query.environment) {
    filters.push(createRuntimeModeCondition("environment", query.environment));
  }

  if (query.planId) {
    filters.push({
      planId: query.planId,
    });
  }

  if (query.status) {
    filters.push({
      status: query.status,
    });
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    filters.push({
      $or: [{ customerName: pattern }, { customerRef: pattern }],
    });
  }

  const mongoQuery =
    filters.length === 0
      ? {}
      : filters.length === 1
        ? filters[0]
        : { $and: filters };

  const subscriptions = await SubscriptionModel.find(mongoQuery)
    .sort({ nextChargeAt: 1 })
    .exec();

  return subscriptions.map(toSubscriptionResponse);
}

export async function getSubscriptionById(
  subscriptionId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const subscription = await ensureSubscriptionScope(
    subscriptionId,
    merchantId,
    environment
  );

  return toSubscriptionResponse(subscription);
}

export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionInput,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const subscription = await ensureSubscriptionScope(
    subscriptionId,
    merchantId,
    environment
  );

  if (input.status !== undefined) {
    subscription.status = input.status;
  }

  if (input.nextChargeAt !== undefined) {
    subscription.nextChargeAt = input.nextChargeAt;
  }

  if (input.retryAvailableAt !== undefined) {
    subscription.retryAvailableAt = input.retryAvailableAt ?? null;
  }

  if (input.lastChargeAt !== undefined) {
    subscription.lastChargeAt = input.lastChargeAt ?? null;
  }

  if (input.localAmount !== undefined) {
    subscription.localAmount = input.localAmount;
  }

  if (input.paymentAccountType !== undefined) {
    subscription.paymentAccountType = input.paymentAccountType;
  }

  if (input.paymentAccountNumber !== undefined) {
    subscription.paymentAccountNumber = input.paymentAccountNumber ?? null;
  }

  if (input.paymentNetworkId !== undefined) {
    subscription.paymentNetworkId = input.paymentNetworkId ?? null;
  }

  await subscription.save();

  return toSubscriptionResponse(subscription);
}

export async function queueSubscriptionCharge(
  subscriptionId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const subscription = await ensureSubscriptionScope(
    subscriptionId,
    merchantId,
    environment
  );

  const queuedJob = await enqueueQueueJob(
    queueNames.subscriptionCharge,
    "subscription-charge",
    { subscriptionId },
    {
      attempts: 5,
      jobId: `subscription-charge-${subscriptionId}-${Math.floor(
        Date.now() / 60000
      )}`,
    }
  );

  if (!queuedJob) {
    const result = await runSubscriptionChargeJob({ subscriptionId });

    return {
      queued: false,
      processedInline: true,
      subscriptionId,
      result,
    };
  }

  return {
    queued: true,
    subscriptionId,
  };
}
