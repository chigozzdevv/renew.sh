import type { Request, Response } from "express";

import {
  createAuditLog,
  listAuditLogs,
} from "@/features/audit/audit.service";
import {
  createAuditSchema,
  listAuditQuerySchema,
} from "@/features/audit/audit.validation";
import { asyncHandler } from "@/shared/utils/async-handler";

export const createAuditController = asyncHandler(
  async (request: Request, response: Response) => {
    const actor =
      request.platformAuthUser?.name ?? request.platformAuthUser?.email ?? "system";
    const input = createAuditSchema.parse({
      ...request.body,
      actor,
      ipAddress: request.ip ?? null,
      userAgent: request.header("user-agent") ?? null,
    });
    const audit = await createAuditLog(input);

    response.status(201).json({
      success: true,
      message: "Audit log created.",
      data: audit,
    });
  }
);

export const listAuditController = asyncHandler(
  async (request: Request, response: Response) => {
    const query = listAuditQuerySchema.parse(request.query);
    const logs = await listAuditLogs(query);

    response.status(200).json({
      success: true,
      data: logs.items,
      pagination: logs.pagination,
    });
  }
);
