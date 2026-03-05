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

const settingRouter = Router();

settingRouter.get("/:merchantId", getSettingsController);
settingRouter.patch("/:merchantId", updateSettingsController);
settingRouter.post(
  "/:merchantId/wallets/save",
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  saveWalletsController
);
settingRouter.post(
  "/:merchantId/wallets/promote-reserve",
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  promoteReserveWalletController
);
settingRouter.post(
  "/:merchantId/wallets/remove-reserve",
  requirePlatformRoles(["owner", "admin"]),
  requirePlatformPermissions(["treasury", "team_admin"]),
  removeReserveWalletController
);

export { settingRouter };
