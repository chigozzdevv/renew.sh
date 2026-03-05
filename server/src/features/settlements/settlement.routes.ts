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
import { requireMerchantKybApproved } from "@/shared/middleware/merchant-kyb";

const settlementRouter = Router();

settlementRouter.get("/", listSettlementsController);
settlementRouter.post(
  "/",
  requireMerchantKybApproved("creating settlements in live mode"),
  createSettlementController
);
settlementRouter.get("/sweeps/approvals", listSweepApprovalsController);
settlementRouter.get("/:settlementId", getSettlementController);
settlementRouter.patch(
  "/:settlementId",
  requireMerchantKybApproved("updating settlements in live mode"),
  updateSettlementController
);
settlementRouter.post(
  "/:settlementId/queue-sweep",
  requireMerchantKybApproved("queueing settlement sweeps in live mode"),
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  queueSettlementSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/request",
  requireMerchantKybApproved("requesting settlement sweep approvals in live mode"),
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  requestSweepApprovalController
);
settlementRouter.post(
  "/:settlementId/sweeps/approve",
  requireMerchantKybApproved("approving settlement sweeps in live mode"),
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  approveSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/reject",
  requireMerchantKybApproved("rejecting settlement sweeps in live mode"),
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  rejectSweepController
);
settlementRouter.post(
  "/:settlementId/sweeps/execute",
  requireMerchantKybApproved("executing settlement sweeps in live mode"),
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  executeApprovedSweepController
);

export { settlementRouter };
