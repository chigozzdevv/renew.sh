import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";

import {
  acceptCollectionRequest,
  createWidgetQuote,
  enqueuePaymentRailSync,
  getCollectionRequest,
  listChannels,
  listNetworks,
  denyCollectionRequest,
  processYellowCardWebhook,
  resolveBankAccount,
  syncChannels,
  syncNetworks,
} from "@/features/payment-rails/payment-rails.service";
import {
  collectionParamSchema,
  createWidgetQuoteSchema,
  listChannelsQuerySchema,
  listNetworksQuerySchema,
  resolveBankAccountSchema,
  syncPaymentRailSchema,
  yellowCardWebhookSchema,
} from "@/features/payment-rails/payment-rails.validation";
import { getYellowCardConfig } from "@/config/yellow-card.config";
import { HttpError } from "@/shared/errors/http-error";
import { asyncHandler } from "@/shared/utils/async-handler";

function normalizeSignature(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return "";
  }

  const parts = cleaned.split("=");
  const signature = parts.length === 2 ? parts[1] : parts[0];
  return signature.trim();
}

function verifyWebhookSignature(rawBody: string, headerValue: string, secret: string) {
  const receivedSignature = normalizeSignature(headerValue);

  if (!receivedSignature) {
    return false;
  }

  const expectedHashBuffer = createHmac("sha256", secret).update(rawBody).digest();
  const expectedBase64Buffer = Buffer.from(expectedHashBuffer.toString("base64"), "utf8");
  const expectedHexBuffer = Buffer.from(expectedHashBuffer.toString("hex"), "utf8");
  const receivedBuffer = Buffer.from(receivedSignature, "utf8");

  if (receivedBuffer.length === expectedBase64Buffer.length) {
    return timingSafeEqual(expectedBase64Buffer, receivedBuffer);
  }

  if (receivedBuffer.length === expectedHexBuffer.length) {
    return timingSafeEqual(expectedHexBuffer, receivedBuffer);
  }

  return false;
}

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
    const channels = await syncChannels(
      input,
      request.platformAuthUser?.merchantId
    );

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
    const networks = await syncNetworks(
      input,
      request.platformAuthUser?.merchantId
    );

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
    const quote = await createWidgetQuote(
      input,
      request.platformAuthUser?.merchantId
    );

    response.status(200).json({
      success: true,
      data: quote,
    });
  }
);

export const resolveBankAccountController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = resolveBankAccountSchema.parse(request.body);
    const result = await resolveBankAccount(
      input,
      request.platformAuthUser?.merchantId
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const getCollectionRequestController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = collectionParamSchema.parse(request.params);
    const result = await getCollectionRequest(
      params.collectionId,
      request.platformAuthUser?.merchantId
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const acceptCollectionRequestController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = collectionParamSchema.parse(request.params);
    const result = await acceptCollectionRequest(
      params.collectionId,
      request.platformAuthUser?.merchantId
    );

    response.status(200).json({
      success: true,
      message: "Collection request accepted.",
      data: result,
    });
  }
);

export const denyCollectionRequestController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = collectionParamSchema.parse(request.params);
    const result = await denyCollectionRequest(
      params.collectionId,
      request.platformAuthUser?.merchantId
    );

    response.status(200).json({
      success: true,
      message: "Collection request denied.",
      data: result,
    });
  }
);

export const processYellowCardWebhookController = asyncHandler(
  async (request: Request, response: Response) => {
    const testConfig = getYellowCardConfig("test");
    const liveConfig = getYellowCardConfig("live");
    const configuredSecrets = [testConfig.webhookSecret, liveConfig.webhookSecret].filter(
      (secret) => secret.length > 0
    );

    if (configuredSecrets.length > 0) {
      const signatureHeader =
        request.header("x-yc-signature") ?? request.header("x-signature") ?? "";

      if (
        !request.rawBody ||
        !configuredSecrets.some((secret) =>
          verifyWebhookSignature(request.rawBody!, signatureHeader, secret)
        )
      ) {
        throw new HttpError(401, "Invalid Yellow Card webhook signature.");
      }
    }

    const input = yellowCardWebhookSchema.parse(request.body);
    const result = await processYellowCardWebhook(input);

    response.status(202).json({
      success: true,
      message: "Yellow Card webhook processed.",
      data: result,
    });
  }
);
