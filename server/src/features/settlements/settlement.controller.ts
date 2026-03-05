import type { Request, Response } from "express";

import {
  approveSweep,
  createSettlement,
  executeApprovedSweep,
  getSettlementById,
  listSettlements,
  listSweepApprovals,
  queueSettlementSweep,
  rejectSweep,
  requestSweepApproval,
  updateSettlement,
} from "@/features/settlements/settlement.service";
import {
  createSettlementSchema,
  listSettlementsQuerySchema,
  listSweepApprovalsQuerySchema,
  rejectSweepApprovalSchema,
  requestSweepApprovalSchema,
  settlementActionSchema,
  settlementParamSchema,
  updateSettlementSchema,
} from "@/features/settlements/settlement.validation";
import { HttpError } from "@/shared/errors/http-error";
import { asyncHandler } from "@/shared/utils/async-handler";

function resolveActor(request: Request) {
  return request.platformAuthUser?.name ?? request.platformAuthUser?.email ?? "system";
}

function resolveMerchantScope(request: Request, fallback?: string) {
  return request.platformAuthUser?.merchantId ?? fallback;
}

function resolveApprover(request: Request) {
  if (!request.platformAuthUser) {
    return null;
  }

  return {
    teamMemberId: request.platformAuthUser.teamMemberId,
    name: request.platformAuthUser.name,
    email: request.platformAuthUser.email,
    role: request.platformAuthUser.role,
  };
}

export const createSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = createSettlementSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
    });
    const settlement = await createSettlement(input);

    response.status(201).json({
      success: true,
      message: "Settlement queued.",
      data: settlement,
    });
  }
);

export const listSettlementsController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listSettlementsQuerySchema.parse({
      ...request.query,
      merchantId: resolveMerchantScope(
        request,
        typeof request.query.merchantId === "string"
          ? request.query.merchantId
          : undefined
      ),
    });
    const settlements = await listSettlements(query);

    response.status(200).json({
      success: true,
      data: settlements,
    });
  }
);

export const getSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const merchantId = resolveMerchantScope(
      request,
      typeof request.query.merchantId === "string"
        ? request.query.merchantId
        : undefined
    );
    const settlement = await getSettlementById(params.settlementId, merchantId);

    response.status(200).json({
      success: true,
      data: settlement,
    });
  }
);

export const updateSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const input = updateSettlementSchema.parse(request.body);
    const merchantId = resolveMerchantScope(
      request,
      typeof request.query.merchantId === "string"
        ? request.query.merchantId
        : undefined
    );
    const settlement = await updateSettlement(params.settlementId, input, merchantId);

    response.status(200).json({
      success: true,
      message: "Settlement updated.",
      data: settlement,
    });
  }
);

export const queueSettlementSweepController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const action = settlementActionSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
      actor: resolveActor(request),
    });
    const result = await queueSettlementSweep(params.settlementId, {
      merchantId: action.merchantId,
      actor: resolveApprover(request) ?? undefined,
    });

    response.status(result.queued ? 202 : 200).json({
      success: true,
      message:
        "awaitingApproval" in result && result.awaitingApproval
          ? "Sweep is waiting for approvals."
          : result.queued
            ? "Settlement sweep queued."
            : "Settlement sweep processed inline.",
      data: result,
    });
  }
);

export const requestSweepApprovalController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const input = requestSweepApprovalSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
      actor: resolveActor(request),
    });
    const approval = await requestSweepApproval(params.settlementId, input);

    response.status(200).json({
      success: true,
      message: "Sweep approval requested.",
      data: approval,
    });
  }
);

export const approveSweepController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const action = settlementActionSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
      actor: resolveActor(request),
    });
    const approver = resolveApprover(request);

    if (!approver) {
      throw new HttpError(401, "Approver context is missing.");
    }

    const approval = await approveSweep(params.settlementId, {
      ...action,
      approver,
    });

    response.status(200).json({
      success: true,
      message: "Sweep approved.",
      data: approval,
    });
  }
);

export const rejectSweepController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const input = rejectSweepApprovalSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
      actor: resolveActor(request),
    });
    const approval = await rejectSweep(params.settlementId, input);

    response.status(200).json({
      success: true,
      message: "Sweep rejected.",
      data: approval,
    });
  }
);

export const executeApprovedSweepController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = settlementParamSchema.parse(request.params);
    const action = settlementActionSchema.parse({
      ...request.body,
      merchantId: resolveMerchantScope(request, request.body?.merchantId),
      actor: resolveActor(request),
    });
    const result = await executeApprovedSweep(params.settlementId, {
      ...action,
      approver: resolveApprover(request) ?? undefined,
    });

    response.status(result.queued ? 202 : 200).json({
      success: true,
      message: result.queued
        ? "Approved sweep queued."
        : "Approved sweep processed inline.",
      data: result,
    });
  }
);

export const listSweepApprovalsController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listSweepApprovalsQuerySchema.parse({
      ...request.query,
      merchantId: resolveMerchantScope(
        request,
        typeof request.query.merchantId === "string"
          ? request.query.merchantId
          : undefined
      ),
    });
    const approvals = await listSweepApprovals(query);

    response.status(200).json({
      success: true,
      data: approvals,
    });
  }
);
