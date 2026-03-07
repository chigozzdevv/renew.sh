"use client";

import { useEffect, useMemo, useState } from "react";

import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  StatusBadge,
  formatDateTime,
  toErrorMessage,
} from "@/components/dashboard/surface-utils";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  MetricCard,
  PageState,
  Select,
  StatGrid,
  Table,
  TableRow,
} from "@/components/dashboard/ui";
import {
  createDeveloperKey,
  createWebhook,
  loadDeveloperWorkspace,
  revokeDeveloperKey,
  rotateWebhookSecret,
  sendWebhookTest,
  updateWebhook,
  type DeveloperKeyRecord,
  type WebhookRecord,
} from "@/lib/developers";

export function DevelopersSurface() {
  const { token, user } = useDashboardSession();
  const { mode } = useWorkspaceMode();
  const [environment, setEnvironment] = useState<"all" | "test" | "live">("all");
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"test" | "live">("test");
  const [newWebhook, setNewWebhook] = useState({
    label: "",
    endpointUrl: "",
    eventTypes: "charge.settled,charge.failed",
    retryPolicy: "exponential" as WebhookRecord["retryPolicy"],
  });
  const [testEventType, setTestEventType] = useState("charge.settled");

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadDeveloperWorkspace({
        token,
        merchantId,
        environment,
      }),
    [environment]
  );

  const keys = data?.keys ?? [];
  const webhooks = data?.webhooks ?? [];
  const deliveries = data?.deliveries ?? [];
  const integrationStatus = data?.integrationStatus;
  const selectedWebhook =
    webhooks.find((webhook) => webhook.id === selectedWebhookId) ?? webhooks[0] ?? null;

  useEffect(() => {
    if (!selectedWebhook) {
      setSelectedWebhookId(null);
      return;
    }

    setSelectedWebhookId(selectedWebhook.id);
  }, [selectedWebhook?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!message && !errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
      setErrorMessage(null);
    }, 3600);

    return () => window.clearTimeout(timeout);
  }, [errorMessage, message]);

  const metrics = useMemo(
    () => ({
      keys: keys.filter((key) => key.status === "active").length,
      webhooks: webhooks.filter((webhook) => webhook.status === "active").length,
      deliveries: deliveries.length,
      failedDeliveries: deliveries.filter((delivery) => delivery.status === "failed").length,
    }),
    [deliveries, keys, webhooks]
  );

  async function runAction(key: string, runner: () => Promise<void>) {
    setIsBusy(key);
    setMessage(null);
    setErrorMessage(null);

    try {
      await runner();
      await reload();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsBusy(null);
    }
  }

  async function handleCreateKey() {
    if (!token || !user?.merchantId || !newKeyLabel.trim()) {
      return;
    }

    await runAction("create-key", async () => {
      const result = await createDeveloperKey({
        token,
        merchantId: user.merchantId,
        label: newKeyLabel.trim(),
        environment: newKeyEnv,
      });
      setNewKeyLabel("");
      setMessage(`API key created: ${result.token}`);
    });
  }

  async function handleRevokeKey(key: DeveloperKeyRecord) {
    if (!token) {
      return;
    }

    await runAction(`revoke-key:${key.id}`, async () => {
      await revokeDeveloperKey({
        token,
        merchantId: key.merchantId,
        developerKeyId: key.id,
      });
      setMessage("API key revoked.");
    });
  }

  async function handleCreateWebhook() {
    if (!token || !user?.merchantId || !newWebhook.label.trim() || !newWebhook.endpointUrl.trim()) {
      return;
    }

    await runAction("create-webhook", async () => {
      const result = await createWebhook({
        token,
        merchantId: user.merchantId,
        label: newWebhook.label.trim(),
        endpointUrl: newWebhook.endpointUrl.trim(),
        eventTypes: newWebhook.eventTypes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        retryPolicy: newWebhook.retryPolicy,
      });
      setNewWebhook({
        label: "",
        endpointUrl: "",
        eventTypes: "charge.settled,charge.failed",
        retryPolicy: "exponential",
      });
      setMessage(`Webhook created. Secret: ${result.secret}`);
    });
  }

  async function handleRotateSecret() {
    if (!token || !selectedWebhook) {
      return;
    }

    await runAction("rotate-secret", async () => {
      const result = await rotateWebhookSecret({
        token,
        merchantId: selectedWebhook.merchantId,
        webhookId: selectedWebhook.id,
      });
      setMessage(`Secret rotated: ${result.secret}`);
    });
  }

  async function handleToggleWebhookStatus(nextStatus: WebhookRecord["status"]) {
    if (!token || !selectedWebhook) {
      return;
    }

    await runAction("update-webhook", async () => {
      await updateWebhook({
        token,
        merchantId: selectedWebhook.merchantId,
        webhookId: selectedWebhook.id,
        payload: {
          status: nextStatus,
        },
      });
      setMessage("Webhook updated.");
    });
  }

  async function handleSendTest() {
    if (!token || !selectedWebhook) {
      return;
    }

    await runAction("send-test", async () => {
      await sendWebhookTest({
        token,
        merchantId: selectedWebhook.merchantId,
        webhookId: selectedWebhook.id,
        eventType: testEventType.trim(),
      });
      setMessage("Test delivery sent.");
    });
  }

  if (isLoading && !data) {
    return <PageState title="Loading developer setup" message="Fetching real keys, webhooks, and deliveries." />;
  }

  if (error || !data) {
    return (
      <PageState
        title="Developer setup unavailable"
        message={error ?? "Unable to load developer resources."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {integrationStatus ? (
        <Card
          title="Integration runtime"
          description="Safe runs against Avalanche. Fiat collection and KYB stay simulated until partner credentials are issued."
          action={
            <Badge tone={mode === "live" ? "warning" : "brand"}>
              Workspace {integrationStatus.workspaceMode}
            </Badge>
          }
        >
          <div className="grid gap-3 lg:grid-cols-3">
            {integrationStatus.providers.map((provider) => (
              <div
                key={provider.key}
                className="rounded-[1.6rem] border border-[color:var(--line)] bg-[#f8faf7] p-4"
              >
                <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                  {provider.label}
                </p>
                <div className="mt-4 space-y-3">
                  {provider.modes.map((entry) => (
                    <div
                      key={`${provider.key}:${entry.mode}`}
                      className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                          {entry.mode}
                        </p>
                        <Badge
                          tone={
                            entry.state === "ready"
                              ? "brand"
                              : entry.state === "simulated"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {entry.implementation}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                        {entry.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <StatGrid>
        <MetricCard label="API keys" value={String(metrics.keys)} note="Active credentials" tone="brand" />
        <MetricCard label="Webhooks" value={String(metrics.webhooks)} note="Active endpoints" />
        <MetricCard label="Deliveries" value={String(metrics.deliveries)} note="Recent events" />
        <MetricCard label="Failed" value={String(metrics.failedDeliveries)} note="Need review" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card title="API keys" description="Real API credentials and webhook endpoints.">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
              <Input placeholder="Key label" value={newKeyLabel} onChange={(event) => setNewKeyLabel(event.target.value)} />
              <Select value={newKeyEnv} onChange={(event) => setNewKeyEnv(event.target.value as "test" | "live")}>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </Select>
              <Button tone="brand" disabled={isBusy === "create-key" || !newKeyLabel.trim()} onClick={() => void handleCreateKey()}>
                {isBusy === "create-key" ? "Creating..." : "Create key"}
              </Button>
            </div>

            <Select value={environment} onChange={(event) => setEnvironment(event.target.value as "all" | "test" | "live")}>
              <option value="all">All environments</option>
              <option value="test">Test</option>
              <option value="live">Live</option>
            </Select>

            {message ? <p className="text-sm text-[color:var(--brand)]">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-[#a8382b]">{errorMessage}</p> : null}

            <Table columns={["Label", "Environment", "Last used", "Status"]}>
              {keys.map((key) => (
                <div key={key.id}>
                  <TableRow columns={4}>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{key.label}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{key.maskedToken}</p>
                    </div>
                    <p className="text-sm text-[color:var(--muted)]">{key.environment}</p>
                    <p className="text-sm text-[color:var(--muted)]">{formatDateTime(key.lastUsedAt)}</p>
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge value={key.status} />
                      {key.status === "active" ? (
                        <Button
                          disabled={isBusy === `revoke-key:${key.id}`}
                          onClick={() => void handleRevokeKey(key)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </TableRow>
                </div>
              ))}
            </Table>
          </div>
        </Card>

        <Card title={selectedWebhook?.label ?? "Webhook profile"} description={selectedWebhook?.endpointUrl ?? "Select a webhook to manage it."}>
          <div className="space-y-4">
            <div className="grid gap-3">
              <Input
                placeholder="Webhook label"
                value={newWebhook.label}
                onChange={(event) =>
                  setNewWebhook((current) => ({ ...current, label: event.target.value }))
                }
              />
              <Input
                placeholder="Endpoint URL"
                value={newWebhook.endpointUrl}
                onChange={(event) =>
                  setNewWebhook((current) => ({
                    ...current,
                    endpointUrl: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Event types comma-separated"
                value={newWebhook.eventTypes}
                onChange={(event) =>
                  setNewWebhook((current) => ({
                    ...current,
                    eventTypes: event.target.value,
                  }))
                }
              />
              <Select
                value={newWebhook.retryPolicy}
                onChange={(event) =>
                  setNewWebhook((current) => ({
                    ...current,
                    retryPolicy: event.target.value as WebhookRecord["retryPolicy"],
                  }))
                }
              >
                <option value="none">No retries</option>
                <option value="linear">Linear</option>
                <option value="exponential">Exponential</option>
              </Select>
              <Button tone="brand" disabled={isBusy === "create-webhook"} onClick={() => void handleCreateWebhook()}>
                {isBusy === "create-webhook" ? "Creating..." : "Create webhook"}
              </Button>
            </div>

            {selectedWebhook ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Status" value={<StatusBadge value={selectedWebhook.status} />} />
                  <Field label="Retry policy" value={selectedWebhook.retryPolicy} />
                  <Field label="Events" value={selectedWebhook.eventTypes.join(", ")} />
                  <Field label="Last delivery" value={formatDateTime(selectedWebhook.lastDeliveryAt)} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button tone="brand" disabled={isBusy === "rotate-secret"} onClick={() => void handleRotateSecret()}>
                    Rotate secret
                  </Button>
                  <Button
                    disabled={isBusy === "update-webhook"}
                    onClick={() =>
                      void handleToggleWebhookStatus(
                        selectedWebhook.status === "active" ? "disabled" : "active"
                      )
                    }
                  >
                    {selectedWebhook.status === "active" ? "Disable" : "Enable"}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input value={testEventType} onChange={(event) => setTestEventType(event.target.value)} />
                  <Button tone="brand" disabled={isBusy === "send-test"} onClick={() => void handleSendTest()}>
                    {isBusy === "send-test" ? "Sending..." : "Send test"}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Webhook deliveries" description="Recent delivery attempts from the real backend.">
        <Table columns={["Event", "Webhook", "HTTP", "Delivered", "Status"]}>
          {deliveries.map((delivery) => {
            const webhook = webhooks.find((item) => item.id === delivery.webhookId);

            return (
              <TableRow key={delivery.id} columns={5}>
                <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{delivery.eventType}</p>
                <p className="text-sm text-[color:var(--muted)]">{webhook?.label ?? delivery.webhookId.slice(-8)}</p>
                <p className="text-sm text-[color:var(--muted)]">{delivery.httpStatus ?? "--"}</p>
                <p className="text-sm text-[color:var(--muted)]">{formatDateTime(delivery.deliveredAt)}</p>
                <div><StatusBadge value={delivery.status} /></div>
              </TableRow>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
