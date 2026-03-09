"use client";

import { fetchApi } from "@/lib/api";

export type PlanRecord = {
  id: string;
  merchantId: string;
  planCode: string;
  name: string;
  usdAmount: number;
  usageRate: number | null;
  billingIntervalDays: number;
  trialDays: number;
  retryWindowHours: number;
  billingMode: "fixed" | "metered";
  supportedMarkets: string[];
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export async function loadPlans(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  status?: PlanRecord["status"] | "all";
  search?: string;
}) {
  const response = await fetchApi<PlanRecord[]>("/plans", {
    token: input.token,
    query: {
      merchantId: input.merchantId,
      environment: input.environment,
      status: input.status && input.status !== "all" ? input.status : undefined,
      search: input.search?.trim() || undefined,
    },
  });

  return response.data;
}

export async function createPlan(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  planCode: string;
  name: string;
  usdAmount: number;
  usageRate: number | null;
  billingIntervalDays: number;
  trialDays: number;
  retryWindowHours: number;
  billingMode: PlanRecord["billingMode"];
  supportedMarkets: string[];
  status: PlanRecord["status"];
}) {
  const response = await fetchApi<PlanRecord>("/plans", {
    method: "POST",
    token: input.token,
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updatePlan(input: {
  token: string;
  planId: string;
  environment: "test" | "live";
  payload: Partial<Omit<PlanRecord, "id" | "merchantId" | "createdAt" | "updatedAt">>;
}) {
  const response = await fetchApi<PlanRecord>(`/plans/${input.planId}`, {
    method: "PATCH",
    token: input.token,
    query: {
      environment: input.environment,
    },
    body: JSON.stringify(input.payload),
  });

  return response.data;
}
