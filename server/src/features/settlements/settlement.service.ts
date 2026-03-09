import { Types } from "mongoose";

import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { appendAuditLog } from "@/features/audit/audit.service";
import { ChargeModel } from "@/features/charges/charge.model";
import { emitChargeWebhookEventForStatusChange } from "@/features/developers/developer-webhook-delivery.service";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { PlanModel } from "@/features/plans/plan.model";
import { SettingModel } from "@/features/settings/setting.model";
import { bridgeSettlementToAvalanche } from "@/features/settlements/cctp.service";
import { SettlementModel } from "@/features/settlements/settlement.model";
import { SubscriptionModel } from "@/features/subscriptions/subscription.model";
import {
  approveTreasuryOperation,
  createSettlementSweepOperation,
  executeTreasuryOperation,
  getTreasuryByMerchantId,
  getSettlementSweepOperation,
  listSettlementSweepOperations,
  rejectTreasuryOperation,
} from "@/features/treasury/treasury.service";
import type {
  ApproveSweepApprovalInput,
  CreateSettlementInput,
  ListSettlementsQuery,
  ListSweepApprovalsQuery,
  RejectSweepApprovalInput,
  RequestSweepApprovalInput,
  SettlementActionInput,
  UpdateSettlementInput,
} from "@/features/settlements/settlement.validation";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import {
  createRuntimeModeCondition,
  toStoredRuntimeMode,
} from "@/shared/utils/runtime-environment";

type SweepApprover = {
  teamMemberId: string;
  name: string;
  email: string;
  role: string;
};

function toSettlementResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  sourceChargeId?: { toString(): string } | null;
  batchRef: string;
  grossUsdc: number;
  feeUsdc: number;
  netUsdc: number;
  destinationWallet: string;
  status: string;
  txHash?: string | null;
  bridgeSourceTxHash?: string | null;
  bridgeReceiveTxHash?: string | null;
  creditTxHash?: string | null;
  protocolExecutionKind?: string | null;
  protocolAmountUsdc?: number | null;
  protocolChargeId?: string | null;
  submittedAt?: Date | null;
  bridgeAttestedAt?: Date | null;
  scheduledFor: Date;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  reversalReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    sourceChargeId: document.sourceChargeId?.toString() ?? null,
    batchRef: document.batchRef,
    grossUsdc: document.grossUsdc,
    feeUsdc: document.feeUsdc,
    netUsdc: document.netUsdc,
    destinationWallet: document.destinationWallet,
    status: document.status,
    txHash: document.txHash ?? null,
    bridgeSourceTxHash: document.bridgeSourceTxHash ?? null,
    bridgeReceiveTxHash: document.bridgeReceiveTxHash ?? null,
    creditTxHash: document.creditTxHash ?? null,
    onchain: {
      id: document.protocolChargeId ?? null,
      executionKind: document.protocolExecutionKind ?? null,
      amountUsdc: document.protocolAmountUsdc ?? null,
      txHash: document.creditTxHash ?? null,
    },
    submittedAt: document.submittedAt ?? null,
    bridgeAttestedAt: document.bridgeAttestedAt ?? null,
    scheduledFor: document.scheduledFor,
    settledAt: document.settledAt ?? null,
    reversedAt: document.reversedAt ?? null,
    reversalReason: document.reversalReason ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toSweepApprovalResponse(document: {
  id: string;
  merchantId: string;
  settlementId?: string | null;
  status: string;
  threshold: number;
  createdBy: string;
  approvedCount: number;
  canExecute: boolean;
  signatures: Array<{
    teamMemberId: string;
    name: string;
    email: string;
    role: string;
    signedAt: Date;
  }>;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  executedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document.id,
    merchantId: document.merchantId,
    settlementId: document.settlementId ?? null,
    status: document.status,
    threshold: document.threshold,
    approvedCount: document.approvedCount,
    canExecute: document.canExecute,
    requestedBy: document.createdBy,
    approvals: document.signatures.map((entry) => ({
      teamMemberId: entry.teamMemberId,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      approvedAt: entry.signedAt,
    })),
    rejectedBy: document.rejectedBy ?? null,
    rejectionReason: document.rejectionReason ?? null,
    rejectedAt: document.rejectedAt ?? null,
    executedAt: document.executedAt ?? null,
    lastActionAt: document.updatedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function resolveChargeStatusFromSettlement(
  settlementStatus: string
): "awaiting_settlement" | "confirming" | "settled" | "failed" | "reversed" {
  switch (settlementStatus) {
    case "queued":
      return "awaiting_settlement";
    case "confirming":
      return "confirming";
    case "settled":
      return "settled";
    case "reversed":
      return "reversed";
    default:
      return "failed";
  }
}

async function syncLinkedChargeFromSettlement(settlement: {
  sourceChargeId?: { toString(): string } | null;
  status: string;
}) {
  if (!settlement.sourceChargeId) {
    return;
  }

  const charge = await ChargeModel.findById(settlement.sourceChargeId).exec();

  if (!charge) {
    return;
  }

  const nextStatus = resolveChargeStatusFromSettlement(settlement.status);
  const failureCode =
    nextStatus === "failed"
      ? "settlement_failed"
      : nextStatus === "reversed"
        ? "settlement_reversed"
        : null;

  const previousStatus = charge.status;

  charge.status = nextStatus;
  charge.failureCode = failureCode;
  charge.processedAt = new Date();
  await charge.save();

  await emitChargeWebhookEventForStatusChange({
    previousStatus,
    chargeId: charge._id.toString(),
    nextStatus: charge.status,
  });
}

async function getSweepApprovalThreshold(merchantId: string) {
  const setting = await SettingModel.findOne({ merchantId })
    .select({ sweepApprovalThreshold: 1 })
    .lean()
    .exec();
  const rawThreshold =
    typeof setting === "object" &&
    setting !== null &&
    "sweepApprovalThreshold" in setting
      ? Number((setting as { sweepApprovalThreshold?: unknown }).sweepApprovalThreshold)
      : NaN;

  if (!Number.isFinite(rawThreshold)) {
    return 1;
  }

  return Math.min(5, Math.max(1, Math.trunc(rawThreshold)));
}

async function ensureSettlementScope(
  settlementId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const mongoQuery: Record<string, unknown> = {
    _id: settlementId,
  };

  if (merchantId) {
    mongoQuery.merchantId = merchantId;
  }

  if (environment) {
    Object.assign(mongoQuery, createRuntimeModeCondition("environment", environment));
  }

  const settlement = await SettlementModel.findOne(mongoQuery).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  return settlement;
}

export async function createSettlement(input: CreateSettlementInput) {
  const merchantExists = await MerchantModel.exists({ _id: input.merchantId });

  if (!merchantExists) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (input.sourceChargeId) {
    const sourceChargeExists = await ChargeModel.exists({
      _id: input.sourceChargeId,
      merchantId: input.merchantId,
      ...createRuntimeModeCondition("environment", input.environment),
    });

    if (!sourceChargeExists) {
      throw new HttpError(404, "Source charge was not found.");
    }
  }

  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "creating settlements",
    input.environment
  );

  const settlement = await SettlementModel.create({
    merchantId: input.merchantId,
    environment: input.environment,
    sourceChargeId: input.sourceChargeId ?? null,
    batchRef: input.batchRef,
    grossUsdc: input.grossUsdc,
    feeUsdc: input.feeUsdc,
    netUsdc: input.netUsdc,
    destinationWallet: input.destinationWallet.toLowerCase(),
    status: input.status,
    txHash: input.txHash ?? null,
    bridgeSourceTxHash: input.bridgeSourceTxHash ?? null,
    bridgeReceiveTxHash: input.bridgeReceiveTxHash ?? null,
    creditTxHash: input.creditTxHash ?? null,
    protocolExecutionKind: input.protocolExecutionKind ?? null,
    protocolAmountUsdc: input.protocolAmountUsdc ?? null,
    protocolChargeId: input.protocolChargeId ?? null,
    submittedAt: input.submittedAt ?? null,
    scheduledFor: input.scheduledFor,
    settledAt: input.settledAt ?? null,
    reversedAt: input.reversedAt ?? null,
    reversalReason: input.reversalReason ?? null,
  });

  await syncLinkedChargeFromSettlement(settlement);

  return toSettlementResponse(settlement);
}

export async function listSettlements(query: ListSettlementsQuery) {
  const filters: Record<string, unknown>[] = [];

  if (query.merchantId) {
    filters.push({
      merchantId: query.merchantId,
    });
  }

  if (query.environment) {
    filters.push(createRuntimeModeCondition("environment", query.environment));
  }

  if (query.status) {
    filters.push({
      status: query.status,
    });
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    filters.push({
      batchRef: pattern,
    });
  }

  const mongoQuery =
    filters.length === 0
      ? {}
      : filters.length === 1
        ? filters[0]
        : { $and: filters };

  const settlements = await SettlementModel.find(mongoQuery)
    .sort({ scheduledFor: -1 })
    .exec();

  return settlements.map(toSettlementResponse);
}

export async function getSettlementById(
  settlementId: string,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const settlement = await ensureSettlementScope(
    settlementId,
    merchantId,
    environment
  );

  return toSettlementResponse(settlement);
}

export async function updateSettlement(
  settlementId: string,
  input: UpdateSettlementInput,
  merchantId?: string,
  environment?: RuntimeMode
) {
  const settlement = await ensureSettlementScope(
    settlementId,
    merchantId,
    environment
  );

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "updating settlements",
    toStoredRuntimeMode(settlement.environment)
  );

  if (input.status !== undefined) {
    settlement.status = input.status;
  }

  if (input.txHash !== undefined) {
    settlement.txHash = input.txHash ?? null;
  }

  if (input.bridgeSourceTxHash !== undefined) {
    settlement.bridgeSourceTxHash = input.bridgeSourceTxHash ?? null;
  }

  if (input.bridgeReceiveTxHash !== undefined) {
    settlement.bridgeReceiveTxHash = input.bridgeReceiveTxHash ?? null;
  }

  if (input.creditTxHash !== undefined) {
    settlement.creditTxHash = input.creditTxHash ?? null;
  }

  if (input.protocolExecutionKind !== undefined) {
    settlement.protocolExecutionKind = input.protocolExecutionKind ?? null;
  }

  if (input.protocolAmountUsdc !== undefined) {
    settlement.protocolAmountUsdc = input.protocolAmountUsdc ?? null;
  }

  if (input.protocolChargeId !== undefined) {
    settlement.protocolChargeId = input.protocolChargeId ?? null;
  }

  if (input.submittedAt !== undefined) {
    settlement.submittedAt = input.submittedAt ?? null;
  }

  if (input.bridgeAttestedAt !== undefined) {
    settlement.bridgeAttestedAt = input.bridgeAttestedAt ?? null;
  }

  if (input.sourceChargeId !== undefined) {
    settlement.sourceChargeId = input.sourceChargeId
      ? new Types.ObjectId(input.sourceChargeId)
      : null;
  }

  if (input.scheduledFor !== undefined) {
    settlement.scheduledFor = input.scheduledFor;
  }

  if (input.settledAt !== undefined) {
    settlement.settledAt = input.settledAt ?? null;
  }

  if (input.reversedAt !== undefined) {
    settlement.reversedAt = input.reversedAt ?? null;
  }

  if (input.reversalReason !== undefined) {
    settlement.reversalReason = input.reversalReason ?? null;
  }

  if (settlement.status === "confirming" && !settlement.submittedAt) {
    settlement.submittedAt = new Date();
  }

  if (settlement.status === "settled" && !settlement.settledAt) {
    settlement.settledAt = new Date();
  }

  if (settlement.status === "reversed" && !settlement.reversedAt) {
    settlement.reversedAt = new Date();
  }

  await settlement.save();

  await syncLinkedChargeFromSettlement(settlement);

  return toSettlementResponse(settlement);
}

export async function requestSweepApproval(
  settlementId: string,
  input: RequestSweepApprovalInput
) {
  const settlement = await ensureSettlementScope(
    settlementId,
    input.merchantId,
    input.environment
  );
  const approval = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
    environment: input.environment,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Requested settlement sweep approval",
    category: "treasury",
    status: "ok",
    target: settlement.batchRef,
    detail: `Approval requested for settlement ${settlement.batchRef}.`,
    metadata: {
      settlementId,
      threshold: approval.threshold,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSweepApprovalResponse(approval);
}

export async function approveSweep(
  settlementId: string,
  input: ApproveSweepApprovalInput & { approver: SweepApprover }
) {
  await ensureSettlementScope(settlementId, input.merchantId, input.environment);
  const operation = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
    environment: input.environment,
  });
  const approval = await approveTreasuryOperation({
    merchantId: input.merchantId,
    operationId: operation.id,
    teamMemberId: input.approver.teamMemberId,
    actor: input.actor,
    signature: input.signature,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Approved settlement sweep",
    category: "treasury",
    status: "ok",
    target: settlementId,
    detail: `${input.approver.name} approved settlement sweep.`,
    metadata: {
      settlementId,
      threshold: approval.threshold,
      approvals: approval.approvedCount,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSweepApprovalResponse(approval);
}

export async function rejectSweep(
  settlementId: string,
  input: RejectSweepApprovalInput
) {
  await ensureSettlementScope(settlementId, input.merchantId, input.environment);
  const operation = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
    environment: input.environment,
  });
  const approval = await rejectTreasuryOperation({
    merchantId: input.merchantId,
    operationId: operation.id,
    actor: input.actor,
    payload: {
      reason: input.reason,
    },
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Rejected settlement sweep",
    category: "treasury",
    status: "warning",
    target: settlementId,
    detail: `Settlement sweep rejected: ${input.reason}`,
    metadata: {
      settlementId,
      reason: input.reason,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSweepApprovalResponse(approval);
}

export async function listSweepApprovals(query: ListSweepApprovalsQuery) {
  const approvals = await listSettlementSweepOperations({
    merchantId: query.merchantId,
    environment: query.environment,
    status: query.status,
    limit: query.limit,
  });

  return approvals.map(toSweepApprovalResponse);
}

export async function queueSettlementSweep(
  settlementId: string,
  options?: {
    merchantId?: string;
    actor?: SweepApprover;
    environment?: RuntimeMode;
  }
) {
  const settlement = await ensureSettlementScope(
    settlementId,
    options?.merchantId,
    options?.environment
  );

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "queueing settlement sweeps",
    toStoredRuntimeMode(settlement.environment)
  );

  if (settlement.status === "settled") {
    return {
      queued: false,
      processedInline: false,
      settlementId,
      result: {
        skipped: true,
        status: "settled",
      },
    };
  }

  const threshold = await getSweepApprovalThreshold(settlement.merchantId.toString());
  const approval = await createSettlementSweepOperation({
    merchantId: settlement.merchantId.toString(),
    settlementId,
    actor:
      options?.actor?.name ??
      options?.actor?.email ??
      options?.merchantId ??
      "system",
    environment: toStoredRuntimeMode(settlement.environment),
  });

  return {
    queued: false,
    processedInline: false,
    settlementId,
    awaitingApproval: approval.approvedCount < Math.max(threshold, approval.threshold),
    approval: toSweepApprovalResponse(approval),
  };
}

export async function queueSettlementBridge(
  settlementId: string,
  options?: {
    merchantId?: string;
    environment?: RuntimeMode;
  }
) {
  const settlement = await ensureSettlementScope(
    settlementId,
    options?.merchantId,
    options?.environment
  );

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "bridging settlements",
    toStoredRuntimeMode(settlement.environment)
  );

  if (
    settlement.status === "settled" ||
    settlement.status === "reversed" ||
    settlement.creditTxHash
  ) {
    return {
      queued: false,
      processedInline: false,
      settlementId,
      result: {
        skipped: true,
        status: settlement.status,
      },
    };
  }

  const queuedJob = await enqueueQueueJob(
    queueNames.settlementBridge,
    "settlement-bridge",
    { settlementId },
    {
      jobId: `settlement-bridge-${settlementId}`,
      attempts: 3,
    }
  );

  if (!queuedJob) {
    console.log(
      `[settlement-bridge] inline-start ${JSON.stringify({
        settlementId,
        environment: options?.environment ?? null,
        merchantId: options?.merchantId ?? null,
      })}`
    );
    const inlineResult = await runSettlementBridgeJob({ settlementId });

    return {
      queued: false,
      processedInline: true,
      settlementId,
      result: inlineResult,
    };
  }

  console.log(
    `[settlement-bridge] queued ${JSON.stringify({
      settlementId,
      environment: options?.environment ?? null,
      merchantId: options?.merchantId ?? null,
    })}`
  );

  return {
    queued: true,
    settlementId,
  };
}

export async function executeApprovedSweep(
  settlementId: string,
  input: SettlementActionInput & { approver?: SweepApprover }
) {
  await ensureSettlementScope(settlementId, input.merchantId, input.environment);
  const operation = await getSettlementSweepOperation(
    settlementId,
    input.merchantId,
    input.environment
  );
  const executed = await executeTreasuryOperation({
    merchantId: input.merchantId,
    operationId: operation.id,
    actor: input.actor,
  });

  return {
    queued: false,
    processedInline: true,
    settlementId,
    result: executed,
  };
}

export async function runSettlementSweepJob(input: { settlementId: string }) {
  const settlement = await SettlementModel.findById(input.settlementId)
    .select({ merchantId: 1, environment: 1 })
    .lean()
    .exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  const operation = await getSettlementSweepOperation(
    input.settlementId,
    settlement.merchantId.toString(),
    toStoredRuntimeMode(settlement.environment)
  );
  const executed = await executeTreasuryOperation({
    merchantId: settlement.merchantId.toString(),
    operationId: operation.id,
    actor: "system",
  });

  return {
    settlementId: input.settlementId,
    status: executed.status,
    txHash: executed.txHash,
  };
}

export async function runSettlementBridgeJob(input: { settlementId: string }) {
  console.log(
    `[settlement-bridge] run-start ${JSON.stringify({
      settlementId: input.settlementId,
    })}`
  );
  const settlement = await SettlementModel.findById(input.settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  if (settlement.creditTxHash) {
    const sweepApproval = await queueSettlementSweep(input.settlementId, {
      merchantId: settlement.merchantId.toString(),
      environment: toStoredRuntimeMode(settlement.environment),
    });

    return {
      settlementId: input.settlementId,
      status: settlement.status,
      bridgeSourceTxHash: settlement.bridgeSourceTxHash ?? null,
      bridgeReceiveTxHash: settlement.bridgeReceiveTxHash ?? null,
      creditTxHash: settlement.creditTxHash ?? null,
      sweepApproval,
    };
  }

  const [merchant, sourceCharge, treasury] = await Promise.all([
    MerchantModel.findById(settlement.merchantId).exec(),
    settlement.sourceChargeId
      ? ChargeModel.findById(settlement.sourceChargeId).exec()
      : Promise.resolve(null),
    getTreasuryByMerchantId(
      settlement.merchantId.toString(),
      toStoredRuntimeMode(settlement.environment)
    ).catch(() => ({
      account: null,
    })),
  ]);

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  const treasurySafeAddress = treasury.account?.safeAddress ?? merchant.merchantAccount;

  if (!treasurySafeAddress) {
    throw new HttpError(
      409,
      "Merchant treasury Safe is not configured for on-chain settlement."
    );
  }

  if (!sourceCharge) {
    throw new HttpError(
      409,
      "Settlement is missing its source charge and cannot be bridged."
    );
  }

  const subscription = await SubscriptionModel.findById(sourceCharge.subscriptionId).exec();
  const plan = subscription ? await PlanModel.findById(subscription.planId).exec() : null;

  if (!subscription || !plan) {
    throw new HttpError(
      409,
      "Settlement charge is missing its activated subscription context."
    );
  }

  if (
    subscription.status !== "active" ||
    !subscription.protocolSubscriptionId ||
    subscription.protocolSyncStatus !== "synced"
  ) {
    throw new HttpError(
      409,
      "Subscription must be active on-chain before settlement execution."
    );
  }

  if (plan.billingMode !== "fixed") {
    throw new HttpError(
      409,
      "Metered subscriptions require usage units before settlement execution."
    );
  }

  const protocolAmountUsdc = sourceCharge.usdcAmount;
  const bridgeResult = await bridgeSettlementToAvalanche({
    mode: "subscription_charge",
    externalChargeId: sourceCharge.externalChargeId,
    protocolSubscriptionId: subscription.protocolSubscriptionId,
    localAmount: sourceCharge.localAmount,
    fxRate: sourceCharge.fxRate,
    usageUnits: 0,
    usdcAmount: sourceCharge.usdcAmount,
  });

  settlement.status = "confirming";
  settlement.bridgeSourceTxHash = bridgeResult.bridgeSourceTxHash;
  settlement.bridgeReceiveTxHash = bridgeResult.bridgeReceiveTxHash;
  settlement.creditTxHash = bridgeResult.creditTxHash;
  settlement.protocolExecutionKind = bridgeResult.protocolExecutionKind;
  settlement.protocolAmountUsdc = protocolAmountUsdc;
  settlement.protocolChargeId = bridgeResult.protocolChargeId ?? null;
  settlement.bridgeAttestedAt = bridgeResult.attestedAt;
  settlement.submittedAt = settlement.submittedAt ?? new Date();
  await settlement.save();

  sourceCharge.protocolChargeId = bridgeResult.protocolChargeId ?? null;
  sourceCharge.protocolTxHash = bridgeResult.creditTxHash;
  sourceCharge.protocolSyncStatus = "executed";
  await sourceCharge.save();

  await syncLinkedChargeFromSettlement(settlement);

  const sweepApproval = await queueSettlementSweep(input.settlementId, {
    merchantId: settlement.merchantId.toString(),
    environment: toStoredRuntimeMode(settlement.environment),
  });

  console.log(
    `[settlement-bridge] run-complete ${JSON.stringify({
      settlementId: input.settlementId,
      status: settlement.status,
      bridgeSourceTxHash: settlement.bridgeSourceTxHash,
      bridgeReceiveTxHash: settlement.bridgeReceiveTxHash,
      creditTxHash: settlement.creditTxHash,
    })}`
  );

  return {
    settlementId: input.settlementId,
    status: settlement.status,
    bridgeSourceTxHash: settlement.bridgeSourceTxHash,
    bridgeReceiveTxHash: settlement.bridgeReceiveTxHash,
    creditTxHash: settlement.creditTxHash,
    sweepApproval,
  };
}
