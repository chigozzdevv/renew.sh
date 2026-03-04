import { Router } from "express";

import {
  createChargeController,
  getChargeController,
  listChargesController,
  retryChargeController,
  updateChargeController,
} from "@/features/charges/charge.controller";

const chargeRouter = Router();

chargeRouter.get("/", listChargesController);
chargeRouter.post("/", createChargeController);
chargeRouter.get("/:chargeId", getChargeController);
chargeRouter.patch("/:chargeId", updateChargeController);
chargeRouter.post("/:chargeId/retry", retryChargeController);

export { chargeRouter };
