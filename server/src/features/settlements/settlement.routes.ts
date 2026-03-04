import { Router } from "express";

import {
  createSettlementController,
  getSettlementController,
  listSettlementsController,
  queueSettlementSweepController,
  updateSettlementController,
} from "@/features/settlements/settlement.controller";

const settlementRouter = Router();

settlementRouter.get("/", listSettlementsController);
settlementRouter.post("/", createSettlementController);
settlementRouter.get("/:settlementId", getSettlementController);
settlementRouter.patch("/:settlementId", updateSettlementController);
settlementRouter.post(
  "/:settlementId/queue-sweep",
  queueSettlementSweepController
);

export { settlementRouter };
