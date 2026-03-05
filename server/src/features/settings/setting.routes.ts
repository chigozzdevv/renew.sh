import { Router } from "express";

import {
  getSettingsController,
  promoteReserveWalletController,
  removeReserveWalletController,
  saveWalletsController,
  updateSettingsController,
} from "@/features/settings/setting.controller";

const settingRouter = Router();

settingRouter.get("/:merchantId", getSettingsController);
settingRouter.patch("/:merchantId", updateSettingsController);
settingRouter.post("/:merchantId/wallets/save", saveWalletsController);
settingRouter.post("/:merchantId/wallets/promote-reserve", promoteReserveWalletController);
settingRouter.post("/:merchantId/wallets/remove-reserve", removeReserveWalletController);

export { settingRouter };
