import { Types } from "mongoose";

import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { appendAuditLog } from "@/features/audit/audit.service";
import { ChargeModel } from "@/features/charges/charge.model";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettingModel } from "@/features/settings/setting.model";
import { SettlementApprovalModel } from "@/features/settlements/settlement-approval.model";
import { SettlementModel } from "@/features/settlements/settlement.model";
import type {
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

function buildMockTxHash(settlementId: string) {
  const hex = settlementId.replace(/[^a-fA-F0-9]/g, "");
  return `0x${`${hex}deadbeefcafebabe`.padEnd(64, "0").slice(0, 64)}`;
}

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
  scheduledFor: Date;
  settledAt?: Date | null;
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
    scheduledFor: document.scheduledFor,
    settledAt: document.settledAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toSweepApprovalResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  settlementId: { toString(): string };
  status: string;
  threshold: number;
  requestedBy: string;
  approvals: Array<{
    teamMemberId: string;
    name: string;
    email: string;
    role: string;
    approvedAt: Date;
  }>;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  executedAt?: Date | null;
  lastActionAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    settlementId: document.settlementId.toString(),
    status: document.status,
    threshold: document.threshold,
    approvedCount: document.approvals.length,
    canExecute:
      document.status !== "executed" &&
      document.status !== "rejected" &&
      document.approvals.length >= document.threshold,
    requestedBy: document.requestedBy,
    approvals: document.approvals,
    rejectedBy: document.rejectedBy ?? null,
    rejectionReason: document.rejectionReason ?? null,
    rejectedAt: document.rejectedAt ?? null,
    executedAt: document.executedAt ?? null,
    lastActionAt: document.lastActionAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function markLinkedChargeSettled(settlement: {
  sourceChargeId?: { toString(): string } | null;
}) {
  if (!settlement.sourceChargeId) {
    return;
  }

  await ChargeModel.findByIdAndUpdate(settlement.sourceChargeId, {
    status: "settled",
    failureCode: null,
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

async function getOrCreateSweepApproval(input: {
  settlementId: string;
  merchantId: string;
  threshold: number;
  requestedBy: string;
}) {
  let approval = await SettlementApprovalModel.findOne({
    settlementId: input.settlementId,
  }).exec();

  if (!approval) {
    approval = await SettlementApprovalModel.create({
      settlementId: input.settlementId,
      merchantId: input.merchantId,
      status: "pending",
      threshold: input.threshold,
      requestedBy: input.requestedBy,
      approvals: [],
      rejectedBy: null,
      rejectionReason: null,
      rejectedAt: null,
      executedAt: null,
      lastActionAt: new Date(),
    });

    return approval;
  }

  if (approval.status === "executed") {
    return approval;
  }

  if (approval.threshold !== input.threshold) {
    approval.threshold = input.threshold;
  }

  approval.requestedBy = input.requestedBy;
  approval.lastActionAt = new Date();
  await approval.save();

  return approval;
}

function ensureSweepApprovalCanProceed(input: {
  approvalStatus: string;
  approvalCount: number;
  threshold: number;
}) {
  if (input.approvalStatus === "rejected") {
    throw new HttpError(
      409,
      "Sweep approval is rejected. Request a new approval cycle first."
    );
  }

  if (input.approvalCount < input.threshold) {
    throw new HttpError(
      409,
      `Sweep requires ${input.threshold} approvals. ${input.approvalCount} recorded.`
    );
  }
}

async function markSweepApprovalExecutedIfNeeded(settlementId: string) {
  const approval = await SettlementApprovalModel.findOne({ settlementId }).exec();

  if (!approval || approval.status === "executed") {
    return;
  }

  approval.status = "executed";
  approval.executedAt = new Date();
  approval.lastActionAt = new Date();
  await approval.save();
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
    scheduledFor: input.scheduledFor,
    settledAt: input.settledAt ?? null,
  });

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

  await settlement.save();

  if (settlement.status === "settled") {
    await markLinkedChargeSettled(settlement);
    await markSweepApprovalExecutedIfNeeded(settlement._id.toString());
  }

  return toSettlementResponse(settlement);
}

export async function requestSweepApproval(
  settlementId: string,
  input: RequestSweepApprovalInput
) {
  const settlement = await ensureSettlementScope(settlementId, input.merchantId);
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "requesting settlement sweep approvals"
  );
  const threshold = input.threshold ?? (await getSweepApprovalThreshold(input.merchantId));

  const approval = await getOrCreateSweepApproval({
    settlementId,
    merchantId: input.merchantId,
    threshold,
    requestedBy: input.actor,
  });

  if (approval.status === "rejected") {
    approval.status = "pending";
    approval.rejectedBy = null;
    approval.rejectedAt = null;
    approval.rejectionReason = null;
    approval.approvals.splice(0, approval.approvals.length);
    approval.lastActionAt = new Date();
    await approval.save();
  }

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
  input: SettlementActionInput & { approver: SweepApprover }
) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "approving settlement sweeps"
  );
  await ensureSettlementScope(settlementId, input.merchantId);
  const threshold = await getSweepApprovalThreshold(input.merchantId);
  const approval = await getOrCreateSweepApproval({
    settlementId,
    merchantId: input.merchantId,
    threshold,
    requestedBy: input.actor,
  });

  if (approval.status === "rejected") {
    throw new HttpError(409, "Sweep approval was rejected.");
  }

  if (approval.status === "executed") {
    return toSweepApprovalResponse(approval);
  }

  const alreadyApproved = approval.approvals.some(
    (entry) => entry.teamMemberId === input.approver.teamMemberId
  );

  if (!alreadyApproved) {
    approval.approvals.push({
      teamMemberId: input.approver.teamMemberId,
      name: input.approver.name,
      email: input.approver.email,
      role: input.approver.role,
      approvedAt: new Date(),
    });
  }

  if (approval.approvals.length >= approval.threshold) {
    approval.status = "approved";
  } else {
    approval.status = "pending";
  }

  approval.lastActionAt = new Date();
  await approval.save();

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
      approvals: approval.approvals.length,
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
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "rejecting settlement sweeps"
  );
  await ensureSettlementScope(settlementId, input.merchantId);
  const threshold = await getSweepApprovalThreshold(input.merchantId);
  const approval = await getOrCreateSweepApproval({
    settlementId,
    merchantId: input.merchantId,
    threshold,
    requestedBy: input.actor,
  });

  if (approval.status === "executed") {
    throw new HttpError(409, "Settled sweep cannot be rejected.");
  }

  approval.status = "rejected";
  approval.rejectedBy = input.actor;
  approval.rejectedAt = new Date();
  approval.rejectionReason = input.reason;
  approval.lastActionAt = new Date();
  await approval.save();

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
  const mongoQuery: Record<string, unknown> = {
    merchantId: query.merchantId,
  };

  if (query.status) {
    mongoQuery.status = query.status;
  }

  const approvals = await SettlementApprovalModel.find(mongoQuery)
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .exec();

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

  if (threshold > 1) {
    const approval = await getOrCreateSweepApproval({
      settlementId,
      merchantId: settlement.merchantId.toString(),
      threshold,
      requestedBy:
        options?.actor?.name ??
        options?.actor?.email ??
        options?.merchantId ??
        "system",
    });

    if (approval.status === "rejected") {
      return {
        queued: false,
        processedInline: false,
        settlementId,
        awaitingApproval: false,
        approval: toSweepApprovalResponse(approval),
      };
    }

    if (approval.approvals.length < approval.threshold) {
      return {
        queued: false,
        processedInline: false,
        settlementId,
        awaitingApproval: true,
        approval: toSweepApprovalResponse(approval),
      };
    }
  }

  const queuedJob = await enqueueQueueJob(
    queueNames.settlementSweep,
    "settlement-sweep",
    { settlementId },
    {
      jobId: `settlement-sweep:${settlementId}:${Date.now()}`,
      attempts: 5,
    }
  );

  if (!queuedJob) {
    const result = await runSettlementSweepJob({ settlementId });

    return {
      queued: false,
      processedInline: true,
      settlementId,
      result,
    };
  }

  return {
    queued: true,
    processedInline: false,
    settlementId,
  };
}

export async function executeApprovedSweep(
  settlementId: string,
  input: SettlementActionInput & { approver?: SweepApprover }
) {
  const approval = await SettlementApprovalModel.findOne({
    settlementId,
    merchantId: input.merchantId,
  }).exec();

  if (!approval) {
    throw new HttpError(409, "Sweep approval has not been requested.");
  }

  ensureSweepApprovalCanProceed({
    approvalStatus: approval.status,
    approvalCount: approval.approvals.length,
    threshold: approval.threshold,
  });

  const queued = await queueSettlementSweep(settlementId, {
    merchantId: input.merchantId,
    actor: input.approver,
  });

  if ("awaitingApproval" in queued && queued.awaitingApproval) {
    throw new HttpError(409, "Sweep still awaits required approvals.");
  }

  return queued;
}

export async function runSettlementSweepJob(input: { settlementId: string }) {
  const settlement = await SettlementModel.findById(input.settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  await assertMerchantKybApprovedForLive(
    settlement.merchantId.toString(),
    "executing settlement sweeps"
  );

  if (settlement.status === "settled") {
    return {
      skipped: true,
      settlementId: settlement._id.toString(),
      status: "settled",
    };
  }

  if (settlement.status === "queued") {
    settlement.status = "confirming";
    settlement.txHash = settlement.txHash ?? buildMockTxHash(settlement._id.toString());
    await settlement.save();

    const queuedFollowUp = await enqueueQueueJob(
      queueNames.settlementSweep,
      "settlement-confirmation",
      { settlementId: settlement._id.toString() },
      {
        delayMs: 1500,
        attempts: 5,
        jobId: `settlement-confirmation:${settlement._id.toString()}:${Date.now()}`,
      }
    );

    if (queuedFollowUp) {
      return {
        settlementId: settlement._id.toString(),
        status: settlement.status,
        txHash: settlement.txHash,
      };
    }
  }

  settlement.status = "settled";
  settlement.txHash = settlement.txHash ?? buildMockTxHash(settlement._id.toString());
  settlement.settledAt = new Date();
  await settlement.save();
  await markLinkedChargeSettled(settlement);
  await markSweepApprovalExecutedIfNeeded(settlement._id.toString());

  return {
    settlementId: settlement._id.toString(),
    status: settlement.status,
    txHash: settlement.txHash,
    settledAt: settlement.settledAt,
  };
}
