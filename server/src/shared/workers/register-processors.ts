import { runSubscriptionChargeJob } from "@/features/charges/charge.service";
import { runPaymentRailSyncJob } from "@/features/payment-rails/payment-rails.service";
import { runSettlementSweepJob } from "@/features/settlements/settlement.service";
import { queueNames } from "@/shared/workers/queue-names";
import { registerQueueProcessor } from "@/shared/workers/queue-runtime";

let processorsRegistered = false;

export function registerWorkerProcessors() {
  if (processorsRegistered) {
    return;
  }

  registerQueueProcessor(queueNames.paymentRailSync, async (payload) =>
    runPaymentRailSyncJob(payload as { country?: string })
  );

  registerQueueProcessor(queueNames.subscriptionCharge, async (payload) =>
    runSubscriptionChargeJob(payload as { subscriptionId: string })
  );

  registerQueueProcessor(queueNames.settlementSweep, async (payload) =>
    runSettlementSweepJob(payload as { settlementId: string })
  );

  processorsRegistered = true;
}
