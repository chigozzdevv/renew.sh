import { Router } from "express";

import { createWaitlistEntryController } from "@/features/waitlist/waitlist.controller";

const waitlistRouter = Router();

waitlistRouter.post("/", createWaitlistEntryController);

export { waitlistRouter };
