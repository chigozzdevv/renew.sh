import type { Request, Response } from "express";

import { dashboardOverviewQuerySchema } from "@/features/dashboard/dashboard.validation";
import { getDashboardOverview } from "@/features/dashboard/dashboard.service";
import { asyncHandler } from "@/shared/utils/async-handler";

function resolveMerchantScope(request: Request, fallback?: string) {
  return request.platformAuthUser?.merchantId ?? fallback;
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
    });
    const overview = await getDashboardOverview(query);

    response.status(200).json({
      success: true,
      data: overview,
    });
  }
);
