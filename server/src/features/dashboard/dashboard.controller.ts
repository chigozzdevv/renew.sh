import type { Request, Response } from "express";

import { dashboardOverviewQuerySchema } from "@/features/dashboard/dashboard.validation";
import { getDashboardOverview } from "@/features/dashboard/dashboard.service";
import { optionalEnvironmentInputSchema } from "@/shared/utils/runtime-environment";
import { asyncHandler } from "@/shared/utils/async-handler";

function resolveMerchantScope(request: Request, fallback?: string) {
  return request.platformAuthUser?.merchantId ?? fallback;
}

function resolveEnvironmentScope(request: Request) {
  return optionalEnvironmentInputSchema.parse(
    typeof request.query.environment === "string"
      ? request.query.environment
      : request.body?.environment
  );
}

export const getDashboardOverviewController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = dashboardOverviewQuerySchema.parse({
      ...request.query,
      merchantId: resolveMerchantScope(
        request,
        typeof request.query.merchantId === "string"
          ? request.query.merchantId
          : undefined
      ),
      environment: resolveEnvironmentScope(request),
    });
    const overview = await getDashboardOverview(query);

    response.status(200).json({
      success: true,
      data: overview,
    });
  }
);
