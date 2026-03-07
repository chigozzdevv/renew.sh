"use client";

import { fetchApi } from "@/lib/api";
import { loadSubscriptionWorkspace, type SubscriptionRecord } from "@/lib/subscriptions";

export type PaymentRecord = {
  id: string;
  merchantId: string;
  subscriptionId: string;
  externalChargeId: string;
  settlementSource: string | null;
  localAmount: number;
  fxRate: number;
  usdcAmount: number;
  feeAmount: number;
  status: "pending" | "awaiting_settlement" | "confirming" | "settled" | "failed" | "reversed";
  failureCode: string | null;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWorkspace = {
  payments: PaymentRecord[];
  subscriptions: SubscriptionRecord[];
};

export async function loadPaymentWorkspace(input: {
  token: string;
  merchantId: string;
  status?: PaymentRecord["status"] | "all";
  search?: string;
}) {
  const [chargesResponse, subscriptionWorkspace] = await Promise.all([
    fetchApi<PaymentRecord[]>("/charges", {
      token: input.token,
      query: {
        merchantId: input.merchantId,
        status: input.status && input.status !== "all" ? input.status : undefined,
        search: input.search?.trim() || undefined,
      },
    }),
    loadSubscriptionWorkspace({
      token: input.token,
      merchantId: input.merchantId,
      status: "all",
    }),
  ]);

  return {
    payments: chargesResponse.data,
    subscriptions: subscriptionWorkspace.subscriptions,
  } satisfies PaymentWorkspace;
}

export async function retryCharge(input: {
  token: string;
  chargeId: string;
}) {
  const response = await fetchApi<{
    queued: boolean;
    processedInline?: boolean;
    chargeId: string;
  }>(`/charges/${input.chargeId}/retry`, {
    method: "POST",
    token: input.token,
  });

  return response.data;
}
