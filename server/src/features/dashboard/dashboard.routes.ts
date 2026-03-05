import { Router } from "express";

import { getDashboardOverviewController } from "@/features/dashboard/dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.get("/overview", getDashboardOverviewController);

export { dashboardRouter };
