"use client";

import { fetchApi } from "@/lib/api";

export type AuditCategory =
  | "workspace"
  | "team"
  | "billing"
  | "security"
  | "developer"
  | "payments"
  | "treasury"
  | "protocol";

export type AuditStatus = "ok" | "warning" | "error";

export type AuditLogRecord = {
  id: string;
  merchantId: string;
  actor: string;
  action: string;
  category: AuditCategory;
  status: AuditStatus;
  target: string | null;
  detail: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogPage = {
  items: AuditLogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function loadAuditLogs(input: {
  token: string;
  merchantId: string;
  category?: AuditCategory | "all";
  status?: AuditStatus | "all";
  search?: string;
  page?: number;
}) {
  const response = await fetchApi<AuditLogPage>("/audit", {
    token: input.token,
    query: {
      merchantId: input.merchantId,
      category: input.category && input.category !== "all" ? input.category : undefined,
      status: input.status && input.status !== "all" ? input.status : undefined,
      search: input.search?.trim() || undefined,
      page: input.page ?? 1,
      limit: 20,
    },
  });

  return response.data;
}
