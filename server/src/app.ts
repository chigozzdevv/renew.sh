import cors from "cors";
import express from "express";

import { getAllowedCorsOrigins } from "@/config/env.config";
import { chargeRouter } from "@/features/charges/charge.routes";
import { merchantRouter } from "@/features/merchants/merchant.routes";
import { paymentRailRouter } from "@/features/payment-rails/payment-rails.routes";
import { planRouter } from "@/features/plans/plan.routes";
import { protocolRouter } from "@/features/protocol/protocol.routes";
import { settlementRouter } from "@/features/settlements/settlement.routes";
import { subscriptionRouter } from "@/features/subscriptions/subscription.routes";
import { waitlistRouter } from "@/features/waitlist/waitlist.routes";
import { errorHandler, notFoundHandler } from "@/shared/middleware/error-handler";

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
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      success: true,
      message: "Renew server is healthy.",
    });
  });

  app.use("/v1/protocol", protocolRouter);
  app.use("/v1/payment-rails", paymentRailRouter);
  app.use("/v1/merchants", merchantRouter);
  app.use("/v1/plans", planRouter);
  app.use("/v1/subscriptions", subscriptionRouter);
  app.use("/v1/charges", chargeRouter);
  app.use("/v1/settlements", settlementRouter);
  app.use("/v1/waitlist", waitlistRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
