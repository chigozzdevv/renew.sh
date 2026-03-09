import cors from "cors";
import express from "express";

import { getAllowedCorsOrigins } from "@/config/env.config";
import { authRouter } from "@/features/auth/auth.routes";
import { chargeRouter } from "@/features/charges/charge.routes";
import { checkoutRouter } from "@/features/checkout/checkout.routes";
import { customerRouter } from "@/features/customers/customer.routes";
import { dashboardRouter } from "@/features/dashboard/dashboard.routes";
import { developerRouter } from "@/features/developers/developer.routes";
import { kycRouter } from "@/features/kyc/kyc.routes";
import { merchantRouter } from "@/features/merchants/merchant.routes";
import { paymentRailRouter } from "@/features/payment-rails/payment-rails.routes";
import { planRouter } from "@/features/plans/plan.routes";
import { protocolRouter } from "@/features/protocol/protocol.routes";
import { auditRouter } from "@/features/audit/audit.routes";
import { settlementRouter } from "@/features/settlements/settlement.routes";
import { settingRouter } from "@/features/settings/setting.routes";
import { subscriptionRouter } from "@/features/subscriptions/subscription.routes";
import { teamRouter } from "@/features/teams/team.routes";
import { treasuryRouter } from "@/features/treasury/treasury.routes";
import { errorHandler, notFoundHandler } from "@/shared/middleware/error-handler";
import { blockLiveModeUntilLaunch } from "@/shared/middleware/live-mode-launch-gate";
import {
  requirePlatformAuth,
  requirePlatformPermissions,
} from "@/shared/middleware/platform-auth";

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedCorsOrigins();

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) {
          callback(null, true);
          return;
        }

        if (
          allowedOrigins.includes("*") ||
          allowedOrigins.includes(requestOrigin)
        ) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by CORS."));
      },
      credentials: false,
    })
  );
  app.use(
    express.json({
      limit: "1mb",
      verify: (request, _response, buffer) => {
        (request as { rawBody?: string }).rawBody = buffer.toString("utf8");
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      success: true,
      message: "Renew server is healthy.",
    });
  });

  app.use("/v1/protocol", protocolRouter);
  app.use("/v1/auth", authRouter);
  app.use("/v1/checkout", checkoutRouter);
  app.use("/v1/kyc", kycRouter);
  app.use("/v1/payment-rails", paymentRailRouter);
  app.use(
    "/v1/merchants",
    requirePlatformAuth,
    requirePlatformPermissions(["team_admin"]),
    merchantRouter
  );
  app.use(
    "/v1/dashboard",
    requirePlatformAuth,
    requirePlatformPermissions([
      "customers",
      "plans",
      "subscriptions",
      "payments",
      "treasury",
      "developers",
      "team_admin",
    ]),
    blockLiveModeUntilLaunch(),
    dashboardRouter
  );
  app.use(
    "/v1/customers",
    requirePlatformAuth,
    requirePlatformPermissions(["customers", "team_admin"]),
    blockLiveModeUntilLaunch(),
    customerRouter
  );
  app.use(
    "/v1/plans",
    requirePlatformAuth,
    requirePlatformPermissions(["plans", "team_admin"]),
    blockLiveModeUntilLaunch(),
    planRouter
  );
  app.use(
    "/v1/subscriptions",
    requirePlatformAuth,
    requirePlatformPermissions(["subscriptions", "team_admin"]),
    blockLiveModeUntilLaunch(),
    subscriptionRouter
  );
  app.use(
    "/v1/charges",
    requirePlatformAuth,
    requirePlatformPermissions(["payments", "team_admin"]),
    blockLiveModeUntilLaunch(),
    chargeRouter
  );
  app.use(
    "/v1/settlements",
    requirePlatformAuth,
    requirePlatformPermissions(["treasury", "team_admin"]),
    blockLiveModeUntilLaunch(),
    settlementRouter
  );
  app.use(
    "/v1/developers",
    requirePlatformAuth,
    requirePlatformPermissions(["developers", "team_admin"]),
    blockLiveModeUntilLaunch(),
    developerRouter
  );
  app.use(
    "/v1/treasury",
    requirePlatformAuth,
    requirePlatformPermissions(["treasury", "team_admin"]),
    blockLiveModeUntilLaunch(),
    treasuryRouter
  );
  app.use(
    "/v1/teams",
    requirePlatformAuth,
    requirePlatformPermissions(["team_admin"]),
    teamRouter
  );
  app.use(
    "/v1/settings",
    requirePlatformAuth,
    requirePlatformPermissions(["team_admin", "treasury"]),
    blockLiveModeUntilLaunch(),
    settingRouter
  );
  app.use(
    "/v1/audit",
    requirePlatformAuth,
    requirePlatformPermissions(["team_admin"]),
    auditRouter
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
