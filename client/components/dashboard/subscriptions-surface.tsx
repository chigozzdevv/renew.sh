"use client";

import { useEffect, useMemo, useState } from "react";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  StatusBadge,
  formatCurrency,
  formatDateTime,
  toErrorMessage,
} from "@/components/dashboard/surface-utils";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
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
  createSubscription,
  loadSubscriptionWorkspace,
  queueSubscriptionCharge,
  updateSubscription,
  type SubscriptionRecord,
} from "@/lib/subscriptions";

type SubscriptionStatusFilter = SubscriptionRecord["status"] | "all";

export function SubscriptionsSurface() {
  const { token, user } = useDashboardSession();
  const [status, setStatus] = useState<SubscriptionStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    planId: "",
    customerRef: "",
    customerName: "",
    billingCurrency: "NGN",
    localAmount: "5000",
    nextChargeAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    paymentAccountType: "bank" as SubscriptionRecord["paymentAccountType"],
  });

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadSubscriptionWorkspace({
        token,
        merchantId,
        status,
        search,
      }),
    [status, search]
  );

  const subscriptions = data?.subscriptions ?? [];
  const plans = data?.plans ?? [];
  const selectedSubscription =
    subscriptions.find((subscription) => subscription.id === selectedId) ??
    subscriptions[0] ??
    null;
  const planNameById = useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan.name])),
    [plans]
  );

  useEffect(() => {
    if (!selectedSubscription) {
      setSelectedId(null);
      return;
    }

    setSelectedId(selectedSubscription.id);
  }, [selectedSubscription?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!message && !errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
      setErrorMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [errorMessage, message]);

  const metrics = useMemo(() => {
    const active = subscriptions.filter((subscription) => subscription.status === "active").length;
    const pastDue = subscriptions.filter((subscription) => subscription.status === "past_due").length;
    const dueSoon = subscriptions.filter(
      (subscription) =>
        new Date(subscription.nextChargeAt).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000
    ).length;

    return {
      total: subscriptions.length,
      active,
      pastDue,
      dueSoon,
    };
  }, [subscriptions]);

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

  async function handleCreate() {
    if (!token || !user?.merchantId || !draft.planId) {
      return;
    }

    await runAction("create-subscription", async () => {
      await createSubscription({
        token,
        merchantId: user.merchantId,
        planId: draft.planId,
        customerRef: draft.customerRef.trim(),
        customerName: draft.customerName.trim(),
        billingCurrency: draft.billingCurrency,
        localAmount: Number(draft.localAmount),
        nextChargeAt: new Date(draft.nextChargeAt).toISOString(),
        paymentAccountType: draft.paymentAccountType,
      });
      setShowCreate(false);
      setMessage("Subscription created.");
    });
  }

  async function handleStatusChange(nextStatus: SubscriptionRecord["status"]) {
    if (!token || !selectedSubscription) {
      return;
    }

    await runAction("update-subscription", async () => {
      await updateSubscription({
        token,
        subscriptionId: selectedSubscription.id,
        payload: {
          status: nextStatus,
        },
      });
      setMessage("Subscription updated.");
    });
  }

  async function handleQueueCharge() {
    if (!token || !selectedSubscription) {
      return;
    }

    await runAction("queue-charge", async () => {
      await queueSubscriptionCharge({
        token,
        subscriptionId: selectedSubscription.id,
      });
      setMessage("Charge queued.");
    });
  }

  if (isLoading && !data) {
    return (
      <PageState title="Loading subscriptions" message="Fetching live recurring billing records." />
    );
  }

  if (error || !data) {
    return (
      <PageState
        title="Subscriptions unavailable"
        message={error ?? "Unable to load subscriptions."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard label="Subscriptions" value={String(metrics.total)} note="Tracked billing records" tone="brand" />
        <MetricCard label="Active" value={String(metrics.active)} note="Collecting now" />
        <MetricCard label="Past due" value={String(metrics.pastDue)} note="Need intervention" />
        <MetricCard label="Due soon" value={String(metrics.dueSoon)} note="Next 48 hours" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card
          title="Subscription list"
          description="Recurring and usage-based subscriptions from the live backend."
          action={<Button onClick={() => setShowCreate((current) => !current)}>{showCreate ? "Close" : "Create subscription"}</Button>}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <Select value={status} onChange={(event) => setStatus(event.target.value as SubscriptionStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Input
                placeholder="Search by customer name or ref"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {showCreate ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-[#f7faf6] p-4 md:grid-cols-2">
                <Select value={draft.planId} onChange={(event) => setDraft((current) => ({ ...current, planId: event.target.value }))}>
                  <option value="">Select plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
                <Select value={draft.billingCurrency} onChange={(event) => setDraft((current) => ({ ...current, billingCurrency: event.target.value }))}>
                  {["NGN", "GHS", "KES", "ZMW", "UGX", "TZS"].map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </Select>
                <Input placeholder="Customer ref" value={draft.customerRef} onChange={(event) => setDraft((current) => ({ ...current, customerRef: event.target.value }))} />
                <Input placeholder="Customer name" value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} />
                <Input placeholder="Local amount" value={draft.localAmount} onChange={(event) => setDraft((current) => ({ ...current, localAmount: event.target.value }))} />
                <Select value={draft.paymentAccountType} onChange={(event) => setDraft((current) => ({ ...current, paymentAccountType: event.target.value as SubscriptionRecord["paymentAccountType"] }))}>
                  <option value="bank">Bank</option>
                  <option value="momo">MoMo</option>
                </Select>
                <Input className="md:col-span-2" type="datetime-local" value={draft.nextChargeAt} onChange={(event) => setDraft((current) => ({ ...current, nextChargeAt: event.target.value }))} />
                <div className="md:col-span-2">
                  <Button
                    tone="brand"
                    disabled={
                      isBusy === "create-subscription" ||
                      !draft.planId ||
                      !draft.customerRef.trim() ||
                      !draft.customerName.trim()
                    }
                    onClick={() => void handleCreate()}
                  >
                    {isBusy === "create-subscription" ? "Saving..." : "Save subscription"}
                  </Button>
                </div>
              </div>
            ) : null}

            {message ? <p className="text-sm text-[color:var(--brand)]">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-[#a8382b]">{errorMessage}</p> : null}

            <Table columns={["Customer", "Plan", "Amount", "Next charge", "Status"]}>
              {subscriptions.map((subscription) => (
                <button key={subscription.id} type="button" className="text-left" onClick={() => setSelectedId(subscription.id)}>
                  <TableRow columns={5}>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{subscription.customerName}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{subscription.customerRef}</p>
                    </div>
                    <p className="text-sm text-[color:var(--muted)]">{planNameById.get(subscription.planId) ?? "Plan"}</p>
                    <p className="text-sm text-[color:var(--muted)]">{formatCurrency(subscription.localAmount, subscription.billingCurrency)}</p>
                    <p className="text-sm text-[color:var(--muted)]">{formatDateTime(subscription.nextChargeAt)}</p>
                    <div><StatusBadge value={subscription.status} /></div>
                  </TableRow>
                </button>
              ))}
            </Table>
          </div>
        </Card>

        <Card title={selectedSubscription?.customerName ?? "Subscription profile"} description={selectedSubscription ? planNameById.get(selectedSubscription.planId) ?? "Plan" : "Select a subscription to inspect its billing state."}>
          {selectedSubscription ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Currency" value={selectedSubscription.billingCurrency} />
                <Field label="Amount" value={formatCurrency(selectedSubscription.localAmount, selectedSubscription.billingCurrency)} />
                <Field label="Next charge" value={formatDateTime(selectedSubscription.nextChargeAt)} />
                <Field label="Last charge" value={formatDateTime(selectedSubscription.lastChargeAt)} />
                <Field label="Account type" value={selectedSubscription.paymentAccountType} />
                <Field label="Retry opens" value={formatDateTime(selectedSubscription.retryAvailableAt)} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button tone="brand" disabled={isBusy === "queue-charge"} onClick={() => void handleQueueCharge()}>
                  {isBusy === "queue-charge" ? "Queueing..." : "Queue charge"}
                </Button>
                {selectedSubscription.status === "active" ? (
                  <Button disabled={isBusy === "update-subscription"} onClick={() => void handleStatusChange("paused")}>
                    Pause
                  </Button>
                ) : selectedSubscription.status === "paused" ? (
                  <Button disabled={isBusy === "update-subscription"} onClick={() => void handleStatusChange("active")}>
                    Resume
                  </Button>
                ) : null}
                {selectedSubscription.status !== "cancelled" ? (
                  <Button tone="danger" disabled={isBusy === "update-subscription"} onClick={() => void handleStatusChange("cancelled")}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              No subscription matches the current filter.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
