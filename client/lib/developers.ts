"use client";

import { fetchApi } from "@/lib/api";

export type DeveloperKeyRecord = {
  id: string;
  merchantId: string;
  label: string;
  environment: "test" | "live";
  maskedToken: string;
  status: "active" | "revoked";
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebhookRecord = {
  id: string;
  merchantId: string;
  label: string;
  endpointUrl: string;
  status: "active" | "disabled";
  eventTypes: string[];
  retryPolicy: "none" | "linear" | "exponential";
  lastDeliveryAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryRecord = {
  id: string;
  merchantId: string;
  webhookId: string;
  eventType: string;
  status: "queued" | "delivered" | "failed";
  httpStatus: number | null;
  attempts: number;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeveloperWorkspace = {
  integrationStatus: {
    workspaceMode: "test" | "live";
    providers: Array<{
      key: "safe" | "yellow_card" | "sumsub";
      label: string;
      modes: Array<{
        mode: "test" | "live";
        implementation: string;
        state: "ready" | "simulated" | "credentials_pending";
        detail: string;
      }>;
    }>;
  };
  keys: DeveloperKeyRecord[];
  webhooks: WebhookRecord[];
  deliveries: DeliveryRecord[];
};

export async function loadDeveloperWorkspace(input: {
  token: string;
  merchantId: string;
  environment?: "test" | "live" | "all";
}) {
  const [integrationResponse, keysResponse, webhooksResponse, deliveriesResponse] =
    await Promise.all([
      fetchApi<DeveloperWorkspace["integrationStatus"]>("/developers/integrations", {
        token: input.token,
        query: {
          merchantId: input.merchantId,
        },
      }),
      fetchApi<DeveloperKeyRecord[]>("/developers/keys", {
        token: input.token,
        query: {
          merchantId: input.merchantId,
          environment:
            input.environment && input.environment !== "all"
              ? input.environment
              : undefined,
        },
      }),
      fetchApi<WebhookRecord[]>("/developers/webhooks", {
        token: input.token,
        query: {
          merchantId: input.merchantId,
        },
      }),
      fetchApi<DeliveryRecord[]>("/developers/deliveries", {
        token: input.token,
        query: {
          merchantId: input.merchantId,
          limit: 12,
        },
      }),
    ]);

  return {
    integrationStatus: integrationResponse.data,
    keys: keysResponse.data,
    webhooks: webhooksResponse.data,
    deliveries: deliveriesResponse.data,
  } satisfies DeveloperWorkspace;
}

export async function createDeveloperKey(input: {
  token: string;
  merchantId: string;
  label: string;
  environment: "test" | "live";
}) {
  const response = await fetchApi<{
    key: DeveloperKeyRecord;
    token: string;
  }>("/developers/keys", {
    method: "POST",
    token: input.token,
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function revokeDeveloperKey(input: {
  token: string;
  merchantId: string;
  developerKeyId: string;
}) {
  const response = await fetchApi<DeveloperKeyRecord>(
    `/developers/keys/${input.developerKeyId}/revoke`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        merchantId: input.merchantId,
      }),
    }
  );

  return response.data;
}

export async function createWebhook(input: {
  token: string;
  merchantId: string;
  label: string;
  endpointUrl: string;
  eventTypes: string[];
  retryPolicy: WebhookRecord["retryPolicy"];
}) {
  const response = await fetchApi<{
    webhook: WebhookRecord;
    secret: string;
  }>("/developers/webhooks", {
    method: "POST",
    token: input.token,
    body: JSON.stringify(input),
  });

  return response.data;
}

export async function updateWebhook(input: {
  token: string;
  merchantId: string;
  webhookId: string;
  payload: Partial<{
    label: string;
    endpointUrl: string;
    eventTypes: string[];
    retryPolicy: WebhookRecord["retryPolicy"];
    status: WebhookRecord["status"];
  }>;
}) {
  const response = await fetchApi<WebhookRecord>(`/developers/webhooks/${input.webhookId}`, {
    method: "PATCH",
    token: input.token,
    query: {
      merchantId: input.merchantId,
    },
    body: JSON.stringify(input.payload),
  });

  return response.data;
}

export async function rotateWebhookSecret(input: {
  token: string;
  merchantId: string;
  webhookId: string;
}) {
  const response = await fetchApi<{
    webhook: WebhookRecord;
    secret: string;
  }>(`/developers/webhooks/${input.webhookId}/rotate-secret`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
    }),
  });

  return response.data;
}

export async function sendWebhookTest(input: {
  token: string;
  merchantId: string;
  webhookId: string;
  eventType: string;
}) {
  const response = await fetchApi<DeliveryRecord>(`/developers/webhooks/${input.webhookId}/test`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
      eventType: input.eventType,
    }),
  });

  return response.data;
}
