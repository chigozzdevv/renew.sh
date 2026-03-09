import type { Request, Response } from "express";

import {
  addTreasuryOwner,
  approveTreasuryOperation,
  bootstrapTreasuryAccount,
  createTreasurySignerChallenge,
  executeTreasuryOperation,
  getTreasuryOperationSigningPayload,
  getTreasuryByMerchantId,
  removeTreasuryOwner,
  rejectTreasuryOperation,
  revokeTreasurySigner,
  updateTreasuryThreshold,
  verifyTreasurySigner,
} from "@/features/treasury/treasury.service";
import {
  addTreasuryOwnerSchema,
  approveTreasuryOperationSchema,
  bootstrapTreasurySchema,
  createTreasurySignerChallengeSchema,
  rejectTreasuryOperationSchema,
  removeTreasuryOwnerSchema,
  treasuryMerchantParamSchema,
  treasuryOperationParamSchema,
  treasurySignerParamSchema,
  updateTreasuryThresholdSchema,
  verifyTreasurySignerSchema,
} from "@/features/treasury/treasury.validation";
import { optionalEnvironmentInputSchema } from "@/shared/utils/runtime-environment";
import { asyncHandler } from "@/shared/utils/async-handler";

function resolveActor(request: Request) {
  return request.platformAuthUser?.name ?? request.platformAuthUser?.email ?? "system";
}

function resolveTeamMemberId(request: Request) {
  return request.platformAuthUser?.teamMemberId ?? null;
}

function resolveEnvironmentScope(request: Request) {
  return optionalEnvironmentInputSchema.parse(
    typeof request.query.environment === "string"
      ? request.query.environment
      : request.body?.environment
  );
}

export const getTreasuryController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const treasury = await getTreasuryByMerchantId(
      params.merchantId,
      resolveEnvironmentScope(request) ?? "test"
    );

    response.status(200).json({
      success: true,
      data: treasury,
    });
  }
);

export const bootstrapTreasuryController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const payload = bootstrapTreasurySchema.parse({
      ...request.body,
      environment: resolveEnvironmentScope(request),
    });
    const treasury = await bootstrapTreasuryAccount({
      merchantId: params.merchantId,
      actor: resolveActor(request),
      payload,
    });

    response.status(201).json({
      success: true,
      message: "Treasury custody configured.",
      data: treasury,
    });
  }
);

export const createTreasurySignerChallengeController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const teamMemberId = resolveTeamMemberId(request);
    const payload = createTreasurySignerChallengeSchema.parse(request.body);

    if (!teamMemberId) {
      response.status(401).json({
        success: false,
        message: "Authenticated team member is required.",
      });
      return;
    }

    const challenge = await createTreasurySignerChallenge({
      merchantId: params.merchantId,
      teamMemberId,
      payload,
    });

    response.status(200).json({
      success: true,
      message: "Treasury signer challenge created.",
      data: challenge,
    });
  }
);

export const verifyTreasurySignerController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const teamMemberId = resolveTeamMemberId(request);
    const payload = verifyTreasurySignerSchema.parse(request.body);

    if (!teamMemberId) {
      response.status(401).json({
        success: false,
        message: "Authenticated team member is required.",
      });
      return;
    }

    const signer = await verifyTreasurySigner({
      merchantId: params.merchantId,
      teamMemberId,
      payload,
    });

    response.status(200).json({
      success: true,
      message: "Treasury signer verified.",
      data: signer,
    });
  }
);

export const revokeTreasurySignerController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasurySignerParamSchema.parse(request.params);
    const signer = await revokeTreasurySigner({
      merchantId: params.merchantId,
      teamMemberId: params.teamMemberId,
      actor: resolveActor(request),
    });

    response.status(200).json({
      success: true,
      message: "Treasury signer revoked.",
      data: signer,
    });
  }
);

export const addTreasuryOwnerController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const payload = addTreasuryOwnerSchema.parse({
      ...request.body,
      environment: resolveEnvironmentScope(request),
    });
    const operation = await addTreasuryOwner({
      merchantId: params.merchantId,
      actor: resolveActor(request),
      payload,
    });

    response.status(201).json({
      success: true,
      message: "Treasury owner change queued.",
      data: operation,
    });
  }
);

export const removeTreasuryOwnerController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasurySignerParamSchema.parse(request.params);
    const payload = removeTreasuryOwnerSchema.parse({
      ...request.body,
      environment: resolveEnvironmentScope(request),
    });
    const operation = await removeTreasuryOwner({
      merchantId: params.merchantId,
      teamMemberId: params.teamMemberId,
      actor: resolveActor(request),
      payload,
    });

    response.status(201).json({
      success: true,
      message: "Treasury owner removal queued.",
      data: operation,
    });
  }
);

export const updateTreasuryThresholdController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryMerchantParamSchema.parse(request.params);
    const payload = updateTreasuryThresholdSchema.parse({
      ...request.body,
      environment: resolveEnvironmentScope(request),
    });
    const operation = await updateTreasuryThreshold({
      merchantId: params.merchantId,
      actor: resolveActor(request),
      payload,
    });

    response.status(201).json({
      success: true,
      message: "Treasury threshold change queued.",
      data: operation,
    });
  }
);

export const getTreasuryOperationSigningPayloadController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryOperationParamSchema.parse(request.params);
    const teamMemberId = resolveTeamMemberId(request);

    if (!teamMemberId) {
      response.status(401).json({
        success: false,
        message: "Authenticated team member is required.",
      });
      return;
    }

    const payload = await getTreasuryOperationSigningPayload({
      merchantId: request.platformAuthUser!.merchantId,
      operationId: params.operationId,
      teamMemberId,
    });

    response.status(200).json({
      success: true,
      data: payload,
    });
  }
);

export const approveTreasuryOperationController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryOperationParamSchema.parse(request.params);
    const teamMemberId = resolveTeamMemberId(request);
    const payload = approveTreasuryOperationSchema.parse(request.body);

    if (!teamMemberId) {
      response.status(401).json({
        success: false,
        message: "Authenticated team member is required.",
      });
      return;
    }

    const operation = await approveTreasuryOperation({
      merchantId: request.platformAuthUser!.merchantId,
      operationId: params.operationId,
      teamMemberId,
      actor: resolveActor(request),
      signature: payload.signature,
    });

    response.status(200).json({
      success: true,
      message: "Treasury operation approved.",
      data: operation,
    });
  }
);

export const rejectTreasuryOperationController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryOperationParamSchema.parse(request.params);
    const payload = rejectTreasuryOperationSchema.parse(request.body);
    const operation = await rejectTreasuryOperation({
      merchantId: request.platformAuthUser!.merchantId,
      operationId: params.operationId,
      actor: resolveActor(request),
      payload,
    });

    response.status(200).json({
      success: true,
      message: "Treasury operation rejected.",
      data: operation,
    });
  }
);

export const executeTreasuryOperationController = asyncHandler(
  async (request: Request, response: Response) => {
    const params = treasuryOperationParamSchema.parse(request.params);
    const operation = await executeTreasuryOperation({
      merchantId: request.platformAuthUser!.merchantId,
      operationId: params.operationId,
      actor: resolveActor(request),
    });

    response.status(200).json({
      success: true,
      message: "Treasury operation submitted.",
      data: operation,
    });
  }
);
