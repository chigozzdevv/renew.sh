import { z } from "zod";

import { environmentInputSchema } from "@/shared/utils/runtime-environment";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

export const dashboardOverviewQuerySchema = z.object({
  merchantId: objectIdSchema,
  environment: environmentInputSchema.default("test"),
});

export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;
