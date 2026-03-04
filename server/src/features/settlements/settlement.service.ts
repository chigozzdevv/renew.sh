import { Types } from "mongoose";

import { HttpError } from "@/shared/errors/http-error";
import { enqueueQueueJob } from "@/shared/workers/queue-runtime";
import { queueNames } from "@/shared/workers/queue-names";

import { ChargeModel } from "@/features/charges/charge.model";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettlementModel } from "@/features/settlements/settlement.model";
import type {
  CreateSettlementInput,
  ListSettlementsQuery,
  UpdateSettlementInput,
} from "@/features/settlements/settlement.validation";

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

export async function createSettlement(input: CreateSettlementInput) {
  const merchantExists = await MerchantModel.exists({ _id: input.merchantId });

  if (!merchantExists) {
    throw new HttpError(404, "Merchant was not found.");
  }

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

export async function getSettlementById(settlementId: string) {
  const settlement = await SettlementModel.findById(settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  return toSettlementResponse(settlement);
}

export async function updateSettlement(
  settlementId: string,
  input: UpdateSettlementInput
) {
  const settlement = await SettlementModel.findById(settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

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
  }

  return toSettlementResponse(settlement);
}

export async function queueSettlementSweep(settlementId: string) {
  const settlement = await SettlementModel.findById(settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
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
    settlementId,
  };
}

export async function runSettlementSweepJob(input: { settlementId: string }) {
  const settlement = await SettlementModel.findById(input.settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

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

  return {
    settlementId: settlement._id.toString(),
    status: settlement.status,
    txHash: settlement.txHash,
    settledAt: settlement.settledAt,
  };
}
