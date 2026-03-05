import type { Request, Response } from "express";

import {
  activateInvite,
  authenticateWithPassword,
  updateAuthenticatedWorkspaceMode,
} from "@/features/auth/auth.service";
import {
  activateInviteSchema,
  loginSchema,
  updateWorkspaceModeSchema,
} from "@/features/auth/auth.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const loginController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = loginSchema.parse(request.body);
    const session = await authenticateWithPassword(input);

    response.status(200).json({
      success: true,
      message: "Authenticated.",
      data: session,
    });
  }
);

export const activateInviteController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = activateInviteSchema.parse(request.body);
    const session = await activateInvite(input);

    response.status(200).json({
      success: true,
      message: "Invite activated.",
      data: session,
    });
  }
);

export const getCurrentSessionController = asyncHandler(
  async (request: Request, response: Response) => {
    response.status(200).json({
      success: true,
      data: request.platformAuthUser ?? null,
    });
  }
);

export const updateWorkspaceModeController = asyncHandler(
  async (request: Request, response: Response) => {
    const user = request.platformAuthUser;

    if (!user) {
      response.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
      return;
    }

    const input = updateWorkspaceModeSchema.parse(request.body);
    const updatedUser = await updateAuthenticatedWorkspaceMode({
      auth: {
        sub: user.teamMemberId,
        merchantId: user.merchantId,
      },
      actor: user.email,
      mode: input.mode,
    });

    response.status(200).json({
      success: true,
      message: "Workspace mode updated.",
      data: updatedUser,
    });
  }
);
