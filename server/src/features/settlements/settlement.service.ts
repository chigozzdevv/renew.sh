import { Types } from "mongoose";

import { HttpError } from "@/shared/errors/http-error";

import { appendAuditLog } from "@/features/audit/audit.service";
import { ChargeModel } from "@/features/charges/charge.model";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettingModel } from "@/features/settings/setting.model";
import { SettlementModel } from "@/features/settlements/settlement.model";
import {
  approveTreasuryOperation,
  createSettlementSweepOperation,
  executeTreasuryOperation,
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
  submittedAt?: Date | null;
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
    submittedAt: document.submittedAt ?? null,
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

  const nextStatus = resolveChargeStatusFromSettlement(settlement.status);
  const failureCode =
    nextStatus === "failed"
      ? "settlement_failed"
      : nextStatus === "reversed"
        ? "settlement_reversed"
        : null;

  await ChargeModel.findByIdAndUpdate(settlement.sourceChargeId, {
    status: nextStatus,
    failureCode,
    processedAt: new Date(),
  }).exec();
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

async function ensureSettlementScope(settlementId: string, merchantId?: string) {
  const settlement = await SettlementModel.findById(settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  if (merchantId && settlement.merchantId.toString() !== merchantId) {
    throw new HttpError(403, "Settlement does not belong to this merchant.");
  }

  return settlement;
}

export async function createSettlement(input: CreateSettlementInput) {
  const merchantExists = await MerchantModel.exists({ _id: input.merchantId });

  if (!merchantExists) {
    throw new HttpError(404, "Merchant was not found.");
  }

  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "creating settlements"
  );

  const settlement = await SettlementModel.create({
    merchantId: input.merchantId,
    sourceChargeId: input.sourceChargeId ?? null,
    batchRef: input.batchRef,
    grossUsdc: input.grossUsdc,
    feeUsdc: input.feeUsdc,
    netUsdc: input.netUsdc,
    destinationWallet: input.destinationWallet.toLowerCase(),
    status: input.status,
    txHash: input.txHash ?? null,
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
  const mongoQuery: Record<string, unknown> = {};

  if (query.merchantId) {
    mongoQuery.merchantId = query.merchantId;
  }

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    mongoQuery.batchRef = pattern;
  }

  const settlements = await SettlementModel.find(mongoQuery)
    .sort({ scheduledFor: -1 })
    .exec();

  return settlements.map(toSettlementResponse);
}

export async function getSettlementById(settlementId: string, merchantId?: string) {
  const settlement = await ensureSettlementScope(settlementId, merchantId);

  return toSettlementResponse(settlement);
}

export async function updateSettlement(
  settlementId: string,
  input: UpdateSettlementInput,
  merchantId?: string
) {
  const settlement = await ensureSettlementScope(settlementId, merchantId);

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "updating settlements"
  );

  if (input.status !== undefined) {
    settlement.status = input.status;
  }

  if (input.txHash !== undefined) {
    settlement.txHash = input.txHash ?? null;
  }

  if (input.submittedAt !== undefined) {
    settlement.submittedAt = input.submittedAt ?? null;
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
  const settlement = await ensureSettlementScope(settlementId, input.merchantId);
  const approval = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
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
  await ensureSettlementScope(settlementId, input.merchantId);
  const operation = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
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
  await ensureSettlementScope(settlementId, input.merchantId);
  const operation = await createSettlementSweepOperation({
    merchantId: input.merchantId,
    settlementId,
    actor: input.actor,
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
  }
) {
  const settlement = await ensureSettlementScope(settlementId, options?.merchantId);

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "queueing settlement sweeps"
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
  });

  return {
    queued: false,
    processedInline: false,
    settlementId,
    awaitingApproval: approval.approvedCount < Math.max(threshold, approval.threshold),
    approval: toSweepApprovalResponse(approval),
  };
}

export async function executeApprovedSweep(
  settlementId: string,
  input: SettlementActionInput & { approver?: SweepApprover }
) {
  const operation = await getSettlementSweepOperation(settlementId, input.merchantId);
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
    .select({ merchantId: 1 })
    .lean()
    .exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  const operation = await getSettlementSweepOperation(
    input.settlementId,
    settlement.merchantId.toString()
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
