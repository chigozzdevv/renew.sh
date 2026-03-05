import { z } from "zod";

import {
  teamPermissions,
  teamRoles,
} from "@/shared/constants/team-rbac";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid Mongo ObjectId.");

const marketSchema = z.string().trim().min(2).max(8).toUpperCase();
const roleSchema = z.enum(teamRoles);
const permissionSchema = z.enum(teamPermissions);
const statusSchema = z.enum(["active", "invited", "suspended"]);
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(160, "Password must be at most 160 characters.");

export const createTeamMemberSchema = z
  .object({
    merchantId: objectIdSchema,
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    role: roleSchema.default("support"),
    status: statusSchema.default("invited"),
    markets: z.array(marketSchema).default([]),
    permissions: z.array(permissionSchema).optional(),
    password: passwordSchema.optional(),
    actor: z.string().trim().min(2).max(120).default("system"),
  })
  .superRefine((value, context) => {
    if (value.status === "active" && !value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required when creating an active team member.",
      });
    }
  });

export const listTeamMembersQuerySchema = z.object({
  merchantId: objectIdSchema,
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const updateTeamMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    markets: z.array(marketSchema).optional(),
    permissions: z.array(permissionSchema).optional(),
    actor: z.string().trim().min(2).max(120).default("system"),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.role !== undefined ||
      value.status !== undefined ||
      value.markets !== undefined ||
      value.permissions !== undefined,
    {
      message: "At least one editable field must be provided.",
      path: [],
    }
  );

export const teamMemberActionSchema = z.object({
  merchantId: objectIdSchema,
  actor: z.string().trim().min(2).max(120).default("system"),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type ListTeamMembersQuery = z.infer<typeof listTeamMembersQuerySchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type TeamMemberActionInput = z.infer<typeof teamMemberActionSchema>;
