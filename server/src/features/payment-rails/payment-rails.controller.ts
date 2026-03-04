import type { Request, Response } from "express";

import {
  createWidgetQuote,
  enqueuePaymentRailSync,
  listChannels,
  listNetworks,
  processYellowCardWebhook,
  resolveBankAccount,
  syncChannels,
  syncNetworks,
} from "@/features/payment-rails/payment-rails.service";
import {
  createWidgetQuoteSchema,
  listChannelsQuerySchema,
  listNetworksQuerySchema,
  resolveBankAccountSchema,
  syncPaymentRailSchema,
  yellowCardWebhookSchema,
} from "@/features/payment-rails/payment-rails.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const listChannelsController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listChannelsQuerySchema.parse(request.query);
    const channels = await listChannels(query);

    response.status(200).json({
      success: true,
      data: channels,
    });
  }
);

export const syncChannelsController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = syncPaymentRailSchema.parse(request.body);
    const channels = await syncChannels(input);

    response.status(200).json({
      success: true,
      message: "Payment channels synced.",
      data: channels,
    });
  }
);

export const listNetworksController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listNetworksQuerySchema.parse(request.query);
    const networks = await listNetworks(query);

    response.status(200).json({
      success: true,
      data: networks,
    });
  }
);

export const syncNetworksController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = syncPaymentRailSchema.parse(request.body);
    const networks = await syncNetworks(input);

    response.status(200).json({
      success: true,
      message: "Payment networks synced.",
      data: networks,
    });
  }
);

export const enqueuePaymentRailSyncController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = syncPaymentRailSchema.parse(request.body);
    const job = await enqueuePaymentRailSync(input);

    response.status(202).json({
      success: true,
      message: "Payment rail sync queued.",
      data: job,
    });
  }
);

export const createWidgetQuoteController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = createWidgetQuoteSchema.parse(request.body);
    const quote = await createWidgetQuote(input);

    response.status(200).json({
      success: true,
      data: quote,
    });
  }
);

export const resolveBankAccountController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = resolveBankAccountSchema.parse(request.body);
    const result = await resolveBankAccount(input);

    response.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const processYellowCardWebhookController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = yellowCardWebhookSchema.parse(request.body);
    const result = await processYellowCardWebhook(input);

    response.status(202).json({
      success: true,
      message: "Yellow Card webhook processed.",
      data: result,
    });
  }
);
