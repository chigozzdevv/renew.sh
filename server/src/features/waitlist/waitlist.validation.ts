import { z } from "zod";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const createWaitlistEntrySchema = z.object({
  email: z.string().trim().email().max(320),
  name: optionalText(120),
  company: optionalText(160),
  useCase: optionalText(500),
  source: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .default("landing-page"),
});

export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntrySchema>;
