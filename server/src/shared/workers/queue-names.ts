export const queueNames = {
  developerWebhookDelivery: "developer-webhook-delivery",
  paymentRailSync: "payment-rail-sync",
  subscriptionCharge: "subscription-charge",
  settlementBridge: "settlement-bridge",
  settlementSweep: "settlement-sweep",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];
