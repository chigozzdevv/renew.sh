import type { Request, Response } from "express";

import {
  getSettingsByMerchantId,
  promoteReserveWallet,
  removeReserveWallet,
  saveWalletSettings,
  updateSettingsByMerchantId,
} from "@/features/settings/setting.service";
import {
  merchantParamSchema,
  saveWalletSchema,
  updateSettingsSchema,
  walletActionSchema,
} from "@/features/settings/setting.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const getSettingsController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = merchantParamSchema.parse(request.params);
    const settings = await getSettingsByMerchantId(params.merchantId);

    response.status(200).json({
      success: true,
      data: settings,
    });
  }
);

export const updateSettingsController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = merchantParamSchema.parse(request.params);
    const input = updateSettingsSchema.parse(request.body);
    const settings = await updateSettingsByMerchantId(params.merchantId, input);

    response.status(200).json({
      success: true,
      message: "Settings updated.",
      data: settings,
    });
  }
);

export const saveWalletsController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = merchantParamSchema.parse(request.params);
    const input = saveWalletSchema.parse(request.body);
    const settings = await saveWalletSettings(params.merchantId, input);

    response.status(200).json({
      success: true,
      message: "Wallet settings updated.",
      data: settings,
    });
  }
);

export const promoteReserveWalletController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = merchantParamSchema.parse(request.params);
    const input = walletActionSchema.parse(request.body);
    const settings = await promoteReserveWallet(params.merchantId, input);

    response.status(200).json({
      success: true,
      message: "Reserve wallet promoted.",
      data: settings,
    });
  }
);

export const removeReserveWalletController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = merchantParamSchema.parse(request.params);
    const input = walletActionSchema.parse(request.body);
    const settings = await removeReserveWallet(params.merchantId, input);

    response.status(200).json({
      success: true,
      message: "Reserve wallet removed.",
      data: settings,
    });
  }
);
