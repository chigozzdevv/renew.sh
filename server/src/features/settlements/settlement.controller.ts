import type { Request, Response } from "express";

import {
  createSettlement,
  getSettlementById,
  listSettlements,
  queueSettlementSweep,
  updateSettlement,
} from "@/features/settlements/settlement.service";
import {
  createSettlementSchema,
  listSettlementsQuerySchema,
  updateSettlementSchema,
} from "@/features/settlements/settlement.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const createSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = createSettlementSchema.parse(request.body);
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
    const query = listSettlementsQuerySchema.parse(request.query);
    const settlements = await listSettlements(query);

    response.status(200).json({
      success: true,
      data: settlements,
    });
  }
);

export const getSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const settlement = await getSettlementById(
      String(request.params.settlementId)
    );

    response.status(200).json({
      success: true,
      data: settlement,
    });
  }
);

export const updateSettlementController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = updateSettlementSchema.parse(request.body);
    const settlement = await updateSettlement(
      String(request.params.settlementId),
      input
    );

    response.status(200).json({
      success: true,
      message: "Settlement updated.",
      data: settlement,
    });
  }
);

export const queueSettlementSweepController = asyncHandler(
  async (request: Request, response: Response) => {
    const result = await queueSettlementSweep(
      String(request.params.settlementId)
    );

    response.status(202).json({
      success: true,
      message: result.queued
        ? "Settlement sweep queued."
        : "Settlement sweep processed inline.",
      data: result,
    });
  }
);
