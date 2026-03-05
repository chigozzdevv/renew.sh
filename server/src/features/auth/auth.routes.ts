import { Router } from "express";

import {
  activateInviteController,
  getCurrentSessionController,
  loginController,
  updateWorkspaceModeController,
} from "@/features/auth/auth.controller";
import {
  requirePlatformAuth,
  requirePlatformPermissions,
} from "@/shared/middleware/platform-auth";

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/activate-invite", activateInviteController);
authRouter.get("/me", requirePlatformAuth, getCurrentSessionController);
authRouter.patch(
  "/me/workspace-mode",
  requirePlatformAuth,
  requirePlatformPermissions(["team_admin"]),
  updateWorkspaceModeController
);

export { authRouter };
