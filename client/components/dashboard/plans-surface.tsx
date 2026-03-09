"use client";

import { useEffect, useMemo, useState } from "react";

import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { MarketMultiSelect } from "@/components/dashboard/market-controls";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { StatusBadge, formatCurrency, toErrorMessage } from "@/components/dashboard/surface-utils";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  Button,
  Card,
  DarkCard,
  DarkField,
  Input,
  MetricCard,
  PageState,
  Select,
  StatGrid,
  Table,
  TableRow,
} from "@/components/dashboard/ui";
import { loadBillingMarketCatalog } from "@/lib/markets";
import { createPlan, loadPlans, updatePlan, type PlanRecord } from "@/lib/plans";

type PlanStatusFilter = PlanRecord["status"] | "all";

export function PlansSurface() {
  const { token, user } = useDashboardSession();
  const { mode } = useWorkspaceMode();
  const [status, setStatus] = useState<PlanStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    planCode: "",
    name: "",
    usdAmount: "",
    usageRate: "",
    billingIntervalDays: "",
    trialDays: "",
    retryWindowHours: "",
    billingMode: "fixed" as PlanRecord["billingMode"],
    supportedMarkets: [] as string[],
    status: "draft" as PlanRecord["status"],
  });

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadPlans({
        token,
        merchantId,
        environment: mode,
        status,
        search,
      }),
    [mode, status, search]
  );
  const { data: marketCatalog } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadBillingMarketCatalog({
        token,
        merchantId,
        environment: mode,
      }),
    [mode]
  );

  const plans = data ?? [];
  const merchantMarketOptions =
    marketCatalog?.markets.filter((market) =>
      marketCatalog.merchantSupportedMarkets.includes(market.currency)
    ) ?? [];
  const selectedPlan = plans.find((plan) => plan.id === selectedId) ?? plans[0] ?? null;

  useEffect(() => {
    if (!selectedPlan) {
      setSelectedId(null);
      return;
    }

    setSelectedId(selectedPlan.id);
  }, [selectedPlan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const active = plans.filter((plan) => plan.status === "active").length;
    const metered = plans.filter((plan) => plan.billingMode === "metered").length;
    const markets = new Set(plans.flatMap((plan) => plan.supportedMarkets)).size;

    return {
      total: plans.length,
      active,
      metered,
      markets,
    };
  }, [plans]);

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
    if (!token || !user?.merchantId) {
      return;
    }

    await runAction("create-plan", async () => {
      await createPlan({
        token,
        merchantId: user.merchantId,
        environment: mode,
        planCode: draft.planCode.trim().toUpperCase(),
        name: draft.name.trim(),
        usdAmount: Number(draft.usdAmount),
        usageRate: draft.usageRate.trim() ? Number(draft.usageRate) : null,
        billingIntervalDays: Number(draft.billingIntervalDays),
        trialDays: draft.trialDays.trim() ? Number(draft.trialDays) : 0,
        retryWindowHours: draft.retryWindowHours.trim()
          ? Number(draft.retryWindowHours)
          : 24,
        billingMode: draft.billingMode,
        supportedMarkets: draft.supportedMarkets,
        status: draft.status,
      });
      setShowCreate(false);
      setDraft({
        planCode: "",
        name: "",
        usdAmount: "",
        usageRate: "",
        billingIntervalDays: "",
        trialDays: "",
        retryWindowHours: "",
        billingMode: "fixed",
        supportedMarkets: [],
        status: "draft",
      });
      setMessage("Plan created.");
    });
  }

  async function handleStatusChange(nextStatus: PlanRecord["status"]) {
    if (!token || !selectedPlan) {
      return;
    }

    await runAction("update-plan", async () => {
      await updatePlan({
        token,
        planId: selectedPlan.id,
        environment: mode,
        payload: {
          status: nextStatus,
        },
      });
      setMessage("Plan updated.");
    });
  }

  if (isLoading && !data) {
    return (
      <PageState
        title="Loading plans"
        message="Fetching plan configuration for the selected environment."
      />
    );
  }

  if (error || !data) {
    return (
      <PageState
        title="Plans unavailable"
        message={error ?? "Unable to load plans."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard label="Plans" value={String(metrics.total)} note="Configured billing plans" tone="brand" />
        <MetricCard label="Active" value={String(metrics.active)} note="Enabled for checkout" />
        <MetricCard label="Metered" value={String(metrics.metered)} note="Usage-based billing" />
        <MetricCard label="Markets" value={String(metrics.markets)} note="Rollout coverage" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card
          title="Plan catalog"
          description="Plan records for the selected environment."
          action={<Button onClick={() => setShowCreate((current) => !current)}>{showCreate ? "Close" : "Create plan"}</Button>}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <Select value={status} onChange={(event) => setStatus(event.target.value as PlanStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
              <Input
                placeholder="Search by plan name or code"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {showCreate ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-[#f7faf6] p-4 md:grid-cols-2">
                <Input placeholder="Plan code" value={draft.planCode} onChange={(event) => setDraft((current) => ({ ...current, planCode: event.target.value }))} />
                <Input placeholder="Plan name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                <Input placeholder="USD amount" value={draft.usdAmount} onChange={(event) => setDraft((current) => ({ ...current, usdAmount: event.target.value }))} />
                <Select value={draft.billingMode} onChange={(event) => setDraft((current) => ({ ...current, billingMode: event.target.value as PlanRecord["billingMode"] }))}>
                  <option value="fixed">Fixed</option>
                  <option value="metered">Metered</option>
                </Select>
                <Input placeholder="Billing interval (days)" value={draft.billingIntervalDays} onChange={(event) => setDraft((current) => ({ ...current, billingIntervalDays: event.target.value }))} />
                <Input placeholder="Usage rate (optional)" value={draft.usageRate} onChange={(event) => setDraft((current) => ({ ...current, usageRate: event.target.value }))} />
                <Input placeholder="Trial days (defaults to 0)" value={draft.trialDays} onChange={(event) => setDraft((current) => ({ ...current, trialDays: event.target.value }))} />
                <Input placeholder="Retry window (hours, defaults to 24)" value={draft.retryWindowHours} onChange={(event) => setDraft((current) => ({ ...current, retryWindowHours: event.target.value }))} />
                <div className="space-y-3 md:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Billing currencies
                  </p>
                  <MarketMultiSelect
                    options={merchantMarketOptions}
                    value={draft.supportedMarkets}
                    onChange={(supportedMarkets) =>
                      setDraft((current) => ({ ...current, supportedMarkets }))
                    }
                    allLabel="All merchant markets"
                  />
                </div>
                <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PlanRecord["status"] }))}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </Select>
                <div className="md:col-span-2">
                  <Button
                    tone="brand"
                    disabled={
                      isBusy === "create-plan" ||
                      !draft.planCode.trim() ||
                      !draft.name.trim() ||
                      !draft.usdAmount.trim() ||
                      !draft.billingIntervalDays.trim() ||
                      draft.supportedMarkets.length === 0
                    }
                    onClick={() => void handleCreate()}
                  >
                    {isBusy === "create-plan" ? "Saving..." : "Save plan"}
                  </Button>
                </div>
              </div>
            ) : null}

            {message ? <p className="text-sm text-[color:var(--brand)]">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-[#a8382b]">{errorMessage}</p> : null}

            <Table columns={["Plan", "Mode", "Price", "Markets", "Status"]}>
              {plans.map((plan) => (
                <button key={plan.id} type="button" className="text-left" onClick={() => setSelectedId(plan.id)}>
                  <TableRow columns={5}>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{plan.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{plan.planCode}</p>
                    </div>
                    <p className="text-sm text-[color:var(--muted)]">{plan.billingMode}</p>
                    <p className="text-sm text-[color:var(--muted)]">{formatCurrency(plan.usdAmount, "USD")}</p>
                    <p className="text-sm text-[color:var(--muted)]">{plan.supportedMarkets.join(", ")}</p>
                    <div><StatusBadge value={plan.status} /></div>
                  </TableRow>
                </button>
              ))}
            </Table>
          </div>
        </Card>

        <DarkCard
          title={selectedPlan?.name ?? "Plan details"}
          description={
            selectedPlan?.planCode ?? "Select a plan to inspect current billing rules."
          }
        >
          {selectedPlan ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DarkField
                  label="USD price"
                  value={formatCurrency(selectedPlan.usdAmount, "USD")}
                />
                <DarkField label="Mode" value={selectedPlan.billingMode} />
                <DarkField
                  label="Interval"
                  value={`${selectedPlan.billingIntervalDays} days`}
                />
                <DarkField label="Trial" value={`${selectedPlan.trialDays} days`} />
                <DarkField
                  label="Retry window"
                  value={`${selectedPlan.retryWindowHours} hours`}
                />
                <DarkField
                  label="Markets"
                  value={selectedPlan.supportedMarkets.join(", ")}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  tone={selectedPlan.status === "active" ? "darkNeutral" : "darkBrand"}
                  disabled={isBusy === "update-plan"}
                  onClick={() =>
                    void handleStatusChange(
                      selectedPlan.status === "active" ? "archived" : "active"
                    )
                  }
                >
                  {isBusy === "update-plan"
                    ? "Saving..."
                    : selectedPlan.status === "active"
                      ? "Archive plan"
                      : "Activate plan"}
                </Button>
                {selectedPlan.status !== "draft" ? null : (
                  <Button
                    tone="darkNeutral"
                    disabled={isBusy === "update-plan"}
                    onClick={() => void handleStatusChange("draft")}
                  >
                    Keep draft
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-white/66">
              No plan matches the current filter.
            </p>
          )}
        </DarkCard>
      </div>
    </div>
  );
}
