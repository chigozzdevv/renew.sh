import cors from "cors";
import express from "express";

import { waitlistRouter } from "@/features/waitlist/waitlist.routes";
import { errorHandler, notFoundHandler } from "@/shared/middleware/error-handler";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
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

  app.use("/api/v1/waitlist", waitlistRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
