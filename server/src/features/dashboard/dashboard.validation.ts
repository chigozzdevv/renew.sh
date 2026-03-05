import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

export const dashboardOverviewQuerySchema = z.object({
  merchantId: objectIdSchema,
});

export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;
