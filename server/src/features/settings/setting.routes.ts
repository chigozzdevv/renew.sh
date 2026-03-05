import { Router } from "express";

import {
  getSettingsController,
  promoteReserveWalletController,
  removeReserveWalletController,
  saveWalletsController,
  updateSettingsController,
} from "@/features/settings/setting.controller";
import {
  requirePlatformPermissions,
  requirePlatformRoles,
} from "@/shared/middleware/platform-auth";
import { requireMerchantKybApproved } from "@/shared/middleware/merchant-kyb";

const settingRouter = Router();

settingRouter.get("/:merchantId", getSettingsController);
settingRouter.patch("/:merchantId", updateSettingsController);
settingRouter.post(
  "/:merchantId/wallets/save",
  requireMerchantKybApproved("changing treasury wallets in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  saveWalletsController
);
settingRouter.post(
  "/:merchantId/wallets/promote-reserve",
  requireMerchantKybApproved("promoting treasury reserve wallets in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  promoteReserveWalletController
);
settingRouter.post(
  "/:merchantId/wallets/remove-reserve",
  requireMerchantKybApproved("removing treasury reserve wallets in live mode"),
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  removeReserveWalletController
);

export { settingRouter };
