import { Router } from "express";

import {
  acceptCollectionRequestController,
  createWidgetQuoteController,
  denyCollectionRequestController,
  enqueuePaymentRailSyncController,
  getCollectionRequestController,
  listChannelsController,
  listNetworksController,
  processYellowCardWebhookController,
  resolveBankAccountController,
  syncChannelsController,
  syncNetworksController,
} from "@/features/payment-rails/payment-rails.controller";

const paymentRailRouter = Router();

paymentRailRouter.get("/channels", listChannelsController);
paymentRailRouter.post("/channels/sync", syncChannelsController);
paymentRailRouter.get("/networks", listNetworksController);
paymentRailRouter.post("/networks/sync", syncNetworksController);
paymentRailRouter.post("/sync", enqueuePaymentRailSyncController);
paymentRailRouter.post("/quotes", createWidgetQuoteController);
paymentRailRouter.post("/banks/resolve", resolveBankAccountController);
paymentRailRouter.get("/collections/:collectionId", getCollectionRequestController);
paymentRailRouter.post("/collections/:collectionId/accept", acceptCollectionRequestController);
paymentRailRouter.post("/collections/:collectionId/deny", denyCollectionRequestController);
paymentRailRouter.post("/webhooks/yellow-card", processYellowCardWebhookController);

export { paymentRailRouter };
