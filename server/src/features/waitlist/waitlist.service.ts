import { HttpError } from "@/shared/errors/http-error";

import { WaitlistModel } from "@/features/waitlist/waitlist.model";
import type { CreateWaitlistEntryInput } from "@/features/waitlist/waitlist.validation";

function toWaitlistResponse(entry: {
  _id: { toString(): string };
  email: string;
  name?: string | null;
  company?: string | null;
  useCase?: string | null;
  source: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: entry._id.toString(),
    email: entry.email,
    name: entry.name ?? null,
    company: entry.company ?? null,
    useCase: entry.useCase ?? null,
    source: entry.source,
    status: entry.status,
    createdAt: entry.createdAt,
  };
}

export async function createWaitlistEntry(input: CreateWaitlistEntryInput) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingEntry = await WaitlistModel.findOne({ email: normalizedEmail }).exec();

  if (existingEntry) {
    throw new HttpError(409, "This email is already on the waitlist.");
  }

  const createdEntry = await WaitlistModel.create({
    email: normalizedEmail,
    name: input.name,
    company: input.company,
    useCase: input.useCase,
    source: input.source,
    status: "pending",
  });

  return toWaitlistResponse(createdEntry);
}
