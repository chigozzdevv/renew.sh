export const queueNames = {
  paymentRailSync: "payment-rail-sync",
  subscriptionCharge: "subscription-charge",
  settlementSweep: "settlement-sweep",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];
