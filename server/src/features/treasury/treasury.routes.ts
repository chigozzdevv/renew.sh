import { Router } from "express";

import {
  addTreasuryOwnerController,
  approveTreasuryOperationController,
  bootstrapTreasuryController,
  createTreasurySignerChallengeController,
  executeTreasuryOperationController,
  getTreasuryOperationSigningPayloadController,
  getTreasuryController,
  removeTreasuryOwnerController,
  rejectTreasuryOperationController,
  revokeTreasurySignerController,
  updateTreasuryThresholdController,
  verifyTreasurySignerController,
} from "@/features/treasury/treasury.controller";
import {
  requirePlatformPermissions,
  requirePlatformRoles,
} from "@/shared/middleware/platform-auth";
import { requireMerchantKybApproved } from "@/shared/middleware/merchant-kyb";

const treasuryRouter = Router();

treasuryRouter.get(
  "/:merchantId",
  requirePlatformPermissions(["treasury", "team_admin"]),
  getTreasuryController
);

treasuryRouter.post(
  "/:merchantId/bootstrap",
  requireMerchantKybApproved("configuring treasury Safe in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  bootstrapTreasuryController
);

treasuryRouter.post(
  "/:merchantId/signers/challenge",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  createTreasurySignerChallengeController
);

treasuryRouter.post(
  "/:merchantId/signers/verify",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  verifyTreasurySignerController
);

treasuryRouter.delete(
  "/:merchantId/signers/:teamMemberId",
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  revokeTreasurySignerController
);

treasuryRouter.post(
  "/:merchantId/owners",
  requireMerchantKybApproved("updating treasury Safe owners in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  addTreasuryOwnerController
);

treasuryRouter.post(
  "/:merchantId/owners/:teamMemberId/remove",
  requireMerchantKybApproved("updating treasury Safe owners in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  removeTreasuryOwnerController
);

treasuryRouter.post(
  "/:merchantId/threshold",
  requireMerchantKybApproved("updating treasury Safe threshold in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  updateTreasuryThresholdController
);

treasuryRouter.get(
  "/operations/:operationId/signing-payload",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  getTreasuryOperationSigningPayloadController
);

treasuryRouter.post(
  "/operations/:operationId/approve",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  approveTreasuryOperationController
);

treasuryRouter.post(
  "/operations/:operationId/reject",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  rejectTreasuryOperationController
);

treasuryRouter.post(
  "/operations/:operationId/execute",
  requirePlatformRoles(["owner", "admin", "finance"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  executeTreasuryOperationController
);

export { treasuryRouter };
