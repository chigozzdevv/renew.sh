import { HttpError } from "@/shared/errors/http-error";

import { MerchantModel } from "@/features/merchants/merchant.model";
import { PlanModel } from "@/features/plans/plan.model";
import type {
  CreatePlanInput,
  ListPlansQuery,
  UpdatePlanInput,
} from "@/features/plans/plan.validation";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import { createRuntimeModeCondition } from "@/shared/utils/runtime-environment";

function toPlanResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  planCode: string;
  name: string;
  usdAmount: number;
  usageRate?: number | null;
  billingIntervalDays: number;
  trialDays: number;
  retryWindowHours: number;
  billingMode: string;
  supportedMarkets: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    planCode: document.planCode,
    name: document.name,
    usdAmount: document.usdAmount,
    usageRate: document.usageRate ?? null,
    billingIntervalDays: document.billingIntervalDays,
    trialDays: document.trialDays,
    retryWindowHours: document.retryWindowHours,
    billingMode: document.billingMode,
    supportedMarkets: document.supportedMarkets,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ensurePlanScope(
  planId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const mongoQuery: Record<string, unknown> = {
    _id: planId,
  };

  if (merchantId) {
    mongoQuery.merchantId = merchantId;
  }

  if (environment) {
    Object.assign(mongoQuery, createRuntimeModeCondition("environment", environment));
  }

  const plan = await PlanModel.findOne(mongoQuery).exec();

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  return plan;
}

export async function createPlan(input: CreatePlanInput) {
  const merchant = await MerchantModel.findById(input.merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  const unsupportedMarkets = input.supportedMarkets.filter(
    (market) => !merchant.supportedMarkets.includes(market)
  );

  if (unsupportedMarkets.length > 0) {
    throw new HttpError(
      409,
      `Plan markets must be selected from the merchant-supported catalog: ${unsupportedMarkets.join(", ")}.`
    );
  }

  const createdPlan = await PlanModel.create({
    merchantId: input.merchantId,
    environment: input.environment,
    planCode: input.planCode,
    name: input.name,
    usdAmount: input.usdAmount,
    usageRate: input.usageRate ?? null,
    billingIntervalDays: input.billingIntervalDays,
    trialDays: input.trialDays,
    retryWindowHours: input.retryWindowHours,
    billingMode: input.billingMode,
    supportedMarkets: input.supportedMarkets,
    status: input.status,
  });

  return toPlanResponse(createdPlan);
}

export async function listPlans(query: ListPlansQuery) {
  const filters: Record<string, unknown>[] = [];

  if (query.merchantId) {
    filters.push({
      merchantId: query.merchantId,
    });
  }

  if (query.environment) {
    filters.push(createRuntimeModeCondition("environment", query.environment));
  }

  if (query.status) {
    filters.push({
      status: query.status,
    });
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    filters.push({
      $or: [{ name: pattern }, { planCode: pattern }],
    });
  }

  const mongoQuery =
    filters.length === 0
      ? {}
      : filters.length === 1
        ? filters[0]
        : { $and: filters };

  const plans = await PlanModel.find(mongoQuery).sort({ createdAt: -1 }).exec();

  return plans.map(toPlanResponse);
}

export async function getPlanById(
  planId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const plan = await ensurePlanScope(planId, merchantId, environment);

  return toPlanResponse(plan);
}

export async function updatePlan(
  planId: string,
  input: UpdatePlanInput,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const plan = await ensurePlanScope(planId, merchantId, environment);
  const merchant = await MerchantModel.findById(plan.merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (input.planCode !== undefined) {
    plan.planCode = input.planCode;
  }
  if (input.name !== undefined) {
    plan.name = input.name;
  }
  if (input.usdAmount !== undefined) {
    plan.usdAmount = input.usdAmount;
  }
  if (input.usageRate !== undefined) {
    plan.usageRate = input.usageRate ?? null;
  }
  if (input.billingIntervalDays !== undefined) {
    plan.billingIntervalDays = input.billingIntervalDays;
  }
  if (input.trialDays !== undefined) {
    plan.trialDays = input.trialDays;
  }
  if (input.retryWindowHours !== undefined) {
    plan.retryWindowHours = input.retryWindowHours;
  }
  if (input.billingMode !== undefined) {
    plan.billingMode = input.billingMode;
  }
  if (input.supportedMarkets !== undefined) {
    const unsupportedMarkets = input.supportedMarkets.filter(
      (market) => !merchant.supportedMarkets.includes(market)
    );

    if (unsupportedMarkets.length > 0) {
      throw new HttpError(
        409,
        `Plan markets must be selected from the merchant-supported catalog: ${unsupportedMarkets.join(", ")}.`
      );
    }
    plan.supportedMarkets = input.supportedMarkets;
  }
  if (input.status !== undefined) {
    plan.status = input.status;
  }

  await plan.save();

  return toPlanResponse(plan);
}
