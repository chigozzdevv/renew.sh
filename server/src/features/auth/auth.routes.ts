import { Router } from "express";

import {
  activateInviteController,
  getCurrentSessionController,
  loginController,
} from "@/features/auth/auth.controller";
import { requirePlatformAuth } from "@/shared/middleware/platform-auth";

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/activate-invite", activateInviteController);
authRouter.get("/me", requirePlatformAuth, getCurrentSessionController);

export { authRouter };
