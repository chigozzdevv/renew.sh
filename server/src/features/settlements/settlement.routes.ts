import { Router } from "express";

import {
  approveSweepController,
  createSettlementController,
  executeApprovedSweepController,
  getSettlementController,
  listSweepApprovalsController,
  listSettlementsController,
  queueSettlementSweepController,
  rejectSweepController,
  requestSweepApprovalController,
  updateSettlementController,
} from "@/features/settlements/settlement.controller";
import {
  requirePlatformPermissions,
  requirePlatformRoles,
} from "@/shared/middleware/platform-auth";

const settlementRouter = Router();

settlementRouter.get("/", listSettlementsController);
settlementRouter.post("/", createSettlementController);
settlementRouter.get("/sweeps/approvals", listSweepApprovalsController);
settlementRouter.get("/:settlementId", getSettlementController);
settlementRouter.patch("/:settlementId", updateSettlementController);
settlementRouter.post(
  "/:settlementId/queue-sweep",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  queueSettlementSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/request",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  requestSweepApprovalController
);
settlementRouter.post(
  "/:settlementId/sweeps/approve",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  approveSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/reject",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  rejectSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/execute",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  executeApprovedSweepController
);

export { settlementRouter };
