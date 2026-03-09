"use client";

import { fetchApi } from "@/lib/api";
import { loadPlans, type PlanRecord } from "@/lib/plans";

export type SubscriptionRecord = {
  id: string;
  merchantId: string;
  planId: string;
  customerRef: string;
  customerName: string;
  billingCurrency: string;
  localAmount: number;
  paymentAccountType: "bank" | "momo";
  paymentAccountNumber: string | null;
  paymentNetworkId: string | null;
  status: "active" | "paused" | "cancelled" | "past_due";
  nextChargeAt: string;
  lastChargeAt: string | null;
  retryAvailableAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionWorkspace = {
  subscriptions: SubscriptionRecord[];
  plans: PlanRecord[];
};

export async function loadSubscriptionWorkspace(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  status?: SubscriptionRecord["status"] | "all";
  search?: string;
}) {
  const [subscriptionsResponse, plans] = await Promise.all([
    fetchApi<SubscriptionRecord[]>("/subscriptions", {
      token: input.token,
      query: {
        merchantId: input.merchantId,
        environment: input.environment,
        status: input.status && input.status !== "all" ? input.status : undefined,
        search: input.search?.trim() || undefined,
      },
    }),
    loadPlans({
      token: input.token,
      merchantId: input.merchantId,
      environment: input.environment,
      status: "all",
    }),
  ]);

  return {
    subscriptions: subscriptionsResponse.data,
    plans,
  } satisfies SubscriptionWorkspace;
}

export async function createSubscription(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  planId: string;
  customerRef: string;
  customerName: string;
  billingCurrency: string;
  localAmount: number;
  nextChargeAt: string;
  paymentAccountType: SubscriptionRecord["paymentAccountType"];
}) {
  const response = await fetchApi<SubscriptionRecord>("/subscriptions", {
    method: "POST",
    token: input.token,
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updateSubscription(input: {
  token: string;
  subscriptionId: string;
  environment: "test" | "live";
  payload: Partial<{
    status: SubscriptionRecord["status"];
    nextChargeAt: string;
    localAmount: number;
    paymentAccountType: SubscriptionRecord["paymentAccountType"];
  }>;
}) {
  const response = await fetchApi<SubscriptionRecord>(`/subscriptions/${input.subscriptionId}`, {
    method: "PATCH",
    token: input.token,
    query: {
      environment: input.environment,
    },
    body: JSON.stringify(input.payload),
  });

  return response.data;
}

export async function queueSubscriptionCharge(input: {
  token: string;
  subscriptionId: string;
  environment: "test" | "live";
}) {
  const response = await fetchApi<{
    queued: boolean;
    processedInline?: boolean;
    subscriptionId: string;
  }>(`/subscriptions/${input.subscriptionId}/queue-charge`, {
    method: "POST",
    token: input.token,
    query: {
      environment: input.environment,
    },
  });

  return response.data;
}
