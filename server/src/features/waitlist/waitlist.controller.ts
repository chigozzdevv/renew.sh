import type { Request, Response } from "express";

import { createWaitlistEntry } from "@/features/waitlist/waitlist.service";
import { createWaitlistEntrySchema } from "@/features/waitlist/waitlist.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const createWaitlistEntryController = asyncHandler(async (request: Request, response: Response) => {
  const input = createWaitlistEntrySchema.parse(request.body);
  const waitlistEntry = await createWaitlistEntry(input);

  response.status(201).json({
    success: true,
    message: "Waitlist entry created.",
    data: waitlistEntry,
  });
});
