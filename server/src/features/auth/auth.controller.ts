import type { Request, Response } from "express";

import {
  activateInvite,
  authenticateWithPassword,
  signupWithPassword,
} from "@/features/auth/auth.service";
import {
  activateInviteSchema,
  loginSchema,
  signupSchema,
} from "@/features/auth/auth.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const signupController = asyncHandler(
  async (request: Request, response: Response) => {
    const input = signupSchema.parse(request.body);
    const session = await signupWithPassword(input);

    response.status(201).json({
      success: true,
      message: "Workspace created.",
      data: session,
    });
  }
);

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
