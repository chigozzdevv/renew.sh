import type { Request, Response } from "express";

import {
  createPlan,
  getPlanById,
  listPlans,
  updatePlan,
} from "@/features/plans/plan.service";
import {
  createPlanSchema,
  listPlansQuerySchema,
  updatePlanSchema,
} from "@/features/plans/plan.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

function resolveMerchantScope(request: Request, fallback?: string) {
  return request.platformAuthUser?.merchantId ?? fallback;
}

export const createPlanController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = createPlanSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
    });
    const plan = await createPlan(input);

    response.status(201).json({
      success: true,
      message: "Plan created.",
      data: plan,
    });
  }
);

export const listPlansController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listPlansQuerySchema.parse({
      ...request.query,
      merchantId: resolveMerchantScope(
        request,
        typeof request.query.merchantId === "string"
          ? request.query.merchantId
          : undefined
      ),
    });
    const plans = await listPlans(query);

    response.status(200).json({
      success: true,
      data: plans,
    });
  }
);

export const getPlanController = asyncHandler(
  async (request: Request, response: Response) => {
    const plan = await getPlanById(
      String(request.params.planId),
      resolveMerchantScope(request)
    );

    response.status(200).json({
      success: true,
      data: plan,
    });
  }
);

export const updatePlanController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = updatePlanSchema.parse(request.body);
    const plan = await updatePlan(
      String(request.params.planId),
      input,
      resolveMerchantScope(request)
    );

    response.status(200).json({
      success: true,
      message: "Plan updated.",
      data: plan,
    });
  }
);
