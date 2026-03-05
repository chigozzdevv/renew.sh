import type { NextFunction, Request, Response, RequestHandler } from "express";

import { env } from "@/config/env.config";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";

function resolveMerchantScope(request: Request) {
  if (request.platformAuthUser?.merchantId) {
    return request.platformAuthUser.merchantId;
  }

  if (typeof request.params.merchantId === "string") {
    return request.params.merchantId.trim();
  }

  if (typeof request.query.merchantId === "string") {
    return request.query.merchantId.trim();
  }

  if (
    typeof request.body === "object" &&
    request.body !== null &&
    "merchantId" in request.body &&
    typeof request.body.merchantId === "string"
  ) {
    return request.body.merchantId.trim();
  }

  return null;
}

export function requireMerchantKybApproved(
  actionDescription = "running this live operation"
): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      if (env.PAYMENT_ENV !== "live") {
        next();
        return;
      }

      const merchantId = resolveMerchantScope(request);

      if (!merchantId) {
        next();
        return;
      }

      await assertMerchantKybApprovedForLive(merchantId, actionDescription);
      next();
    } catch (error) {
      next(error);
    }
  };
}
