import cors from "cors";
import express from "express";

import { getAllowedCorsOrigins } from "@/config/env.config";
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

  app.use("/v1/waitlist", waitlistRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
