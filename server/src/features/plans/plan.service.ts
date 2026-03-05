import { HttpError } from "@/shared/errors/http-error";

import { MerchantModel } from "@/features/merchants/merchant.model";
import { PlanModel } from "@/features/plans/plan.model";
import type {
  CreatePlanInput,
  ListPlansQuery,
  UpdatePlanInput,
} from "@/features/plans/plan.validation";

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

async function ensurePlanScope(planId: string, merchantId?: string) {
  const plan = await PlanModel.findById(planId).exec();

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  if (merchantId && plan.merchantId.toString() !== merchantId) {
    throw new HttpError(403, "Plan does not belong to this merchant.");
  }

  return plan;
}

export async function createPlan(input: CreatePlanInput) {
  const merchantExists = await MerchantModel.exists({ _id: input.merchantId });

  if (!merchantExists) {
    throw new HttpError(404, "Merchant was not found.");
  }

  const createdPlan = await PlanModel.create({
    merchantId: input.merchantId,
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
  const mongoQuery: Record<string, unknown> = {};

  if (query.merchantId) {
    mongoQuery.merchantId = query.merchantId;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    mongoQuery.$or = [{ name: pattern }, { planCode: pattern }];
  }

  const plans = await PlanModel.find(mongoQuery).sort({ createdAt: -1 }).exec();

  return plans.map(toPlanResponse);
}

export async function getPlanById(planId: string, merchantId?: string) {
  const plan = await ensurePlanScope(planId, merchantId);

  return toPlanResponse(plan);
}

export async function updatePlan(
  planId: string,
  input: UpdatePlanInput,
  merchantId?: string
) {
  const plan = await ensurePlanScope(planId, merchantId);

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
    plan.supportedMarkets = input.supportedMarkets;
  }
  if (input.status !== undefined) {
    plan.status = input.status;
  }

  await plan.save();

  return toPlanResponse(plan);
}
