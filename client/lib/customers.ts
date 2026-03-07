"use client";

import { fetchApi } from "@/lib/api";

export type CustomerRecord = {
  id: string;
  merchantId: string;
  customerRef: string;
  name: string;
  email: string;
  market: string;
  status: "active" | "paused" | "at_risk" | "blacklisted";
  billingState: "healthy" | "at_risk" | "past_due" | "paused";
  paymentMethodState: "ok" | "update_needed" | "expired" | "missing";
  subscriptionCount: number;
  monthlyVolumeUsdc: number;
  nextRenewalAt: string | null;
  lastChargeAt: string | null;
  autoReminderEnabled: boolean;
  blacklistedAt: string | null;
  blacklistReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export async function loadCustomers(input: {
  token: string;
  merchantId: string;
  status?: CustomerRecord["status"] | "all";
  market?: string;
  search?: string;
}) {
  const response = await fetchApi<CustomerRecord[]>("/customers", {
    token: input.token,
    query: {
      merchantId: input.merchantId,
      status: input.status && input.status !== "all" ? input.status : undefined,
      market: input.market?.trim() ? input.market.trim().toUpperCase() : undefined,
      search: input.search?.trim() || undefined,
    },
  });

  return response.data;
}

export async function createCustomer(input: {
  token: string;
  merchantId: string;
  customerRef: string;
  name: string;
  email: string;
  market: string;
}) {
  const response = await fetchApi<CustomerRecord>("/customers", {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
      customerRef: input.customerRef,
      name: input.name,
      email: input.email,
      market: input.market,
    }),
  });

  return response.data;
}

export async function pauseCustomer(input: {
  token: string;
  merchantId: string;
  customerId: string;
}) {
  const response = await fetchApi<CustomerRecord>(`/customers/${input.customerId}/pause`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
    }),
  });

  return response.data;
}

export async function resumeCustomer(input: {
  token: string;
  merchantId: string;
  customerId: string;
}) {
  const response = await fetchApi<CustomerRecord>(`/customers/${input.customerId}/resume`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
    }),
  });

  return response.data;
}

export async function blacklistCustomer(input: {
  token: string;
  merchantId: string;
  customerId: string;
  reason: string;
}) {
  const response = await fetchApi<CustomerRecord>(`/customers/${input.customerId}/blacklist`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
      reason: input.reason,
    }),
  });

  return response.data;
}
