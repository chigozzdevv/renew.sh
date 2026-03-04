import type { Request, Response } from "express";

import {
  createSubscription,
  getSubscriptionById,
  listSubscriptions,
  queueSubscriptionCharge,
  updateSubscription,
} from "@/features/subscriptions/subscription.service";
import {
  createSubscriptionSchema,
  listSubscriptionsQuerySchema,
  updateSubscriptionSchema,
} from "@/features/subscriptions/subscription.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const createSubscriptionController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = createSubscriptionSchema.parse(request.body);
    const subscription = await createSubscription(input);

    response.status(201).json({
      success: true,
      message: "Subscription created.",
      data: subscription,
    });
  }
);

export const listSubscriptionsController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listSubscriptionsQuerySchema.parse(request.query);
    const subscriptions = await listSubscriptions(query);

    response.status(200).json({
      success: true,
      data: subscriptions,
    });
  }
);

export const getSubscriptionController = asyncHandler(
  async (request: Request, response: Response) => {
    const subscription = await getSubscriptionById(
      String(request.params.subscriptionId)
    );

    response.status(200).json({
      success: true,
      data: subscription,
    });
  }
);

export const updateSubscriptionController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = updateSubscriptionSchema.parse(request.body);
    const subscription = await updateSubscription(
      String(request.params.subscriptionId),
      input
    );

    response.status(200).json({
      success: true,
      message: "Subscription updated.",
      data: subscription,
    });
  }
);

export const queueSubscriptionChargeController = asyncHandler(
  async (request: Request, response: Response) => {
    const result = await queueSubscriptionCharge(
      String(request.params.subscriptionId)
    );

    response.status(202).json({
      success: true,
      message: result.queued
        ? "Subscription charge queued."
        : "Subscription charge processed inline.",
      data: result,
    });
  }
);
