"use client";

import { useEffect, useMemo, useState } from "react";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { StatusBadge, formatCurrency, formatDate, toErrorMessage } from "@/components/dashboard/surface-utils";
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
  blacklistCustomer,
  createCustomer,
  loadCustomers,
  pauseCustomer,
  resumeCustomer,
  type CustomerRecord,
} from "@/lib/customers";

type CustomerStatusFilter = CustomerRecord["status"] | "all";

export function CustomersSurface() {
  const { token, user } = useDashboardSession();
  const [status, setStatus] = useState<CustomerStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    customerRef: "",
    name: "",
    email: "",
    market: "NGN",
  });

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadCustomers({
        token,
        merchantId,
        status,
        search,
      }),
    [status, search]
  );

  const customers = data ?? [];
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ?? customers[0] ?? null;

  useEffect(() => {
    if (!selectedCustomer) {
      setSelectedId(null);
      return;
    }

    setSelectedId(selectedCustomer.id);
  }, [selectedCustomer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const atRisk = customers.filter(
      (customer) =>
        customer.status === "at_risk" ||
        customer.billingState === "at_risk" ||
        customer.paymentMethodState === "update_needed"
    ).length;
    const markets = new Set(customers.map((customer) => customer.market)).size;
    const active = customers.filter((customer) => customer.status === "active").length;

    return {
      total: customers.length,
      active,
      atRisk,
      markets,
    };
  }, [customers]);

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

    await runAction("create-customer", async () => {
      await createCustomer({
        token,
        merchantId: user.merchantId,
        customerRef: draft.customerRef.trim(),
        name: draft.name.trim(),
        email: draft.email.trim(),
        market: draft.market.trim().toUpperCase(),
      });
      setDraft({
        customerRef: "",
        name: "",
        email: "",
        market: draft.market,
      });
      setShowCreate(false);
      setMessage("Customer added.");
    });
  }

  async function handlePauseResume(action: "pause" | "resume") {
    if (!token || !user?.merchantId || !selectedCustomer) {
      return;
    }

    await runAction(action, async () => {
      if (action === "pause") {
        await pauseCustomer({
          token,
          merchantId: user.merchantId,
          customerId: selectedCustomer.id,
        });
      } else {
        await resumeCustomer({
          token,
          merchantId: user.merchantId,
          customerId: selectedCustomer.id,
        });
      }
      setMessage(
        action === "pause" ? "Customer billing paused." : "Customer billing resumed."
      );
    });
  }

  async function handleBlacklist() {
    if (!token || !user?.merchantId || !selectedCustomer) {
      return;
    }

    await runAction("blacklist", async () => {
      await blacklistCustomer({
        token,
        merchantId: user.merchantId,
        customerId: selectedCustomer.id,
        reason: "Manual operator block.",
      });
      setMessage("Customer blacklisted.");
    });
  }

  if (isLoading && !data) {
    return (
      <PageState
        title="Loading customers"
        message="Fetching customer records from the billing backend."
      />
    );
  }

  if (error || !data) {
    return (
      <PageState
        title="Customers unavailable"
        message={error ?? "Unable to load customers."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard label="Customers" value={String(metrics.total)} note="Directory records" tone="brand" />
        <MetricCard label="Active" value={String(metrics.active)} note="Billing active" />
        <MetricCard label="At risk" value={String(metrics.atRisk)} note="Need follow-up" />
        <MetricCard label="Markets" value={String(metrics.markets)} note="Live coverage" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <Card
          title="Customer directory"
          description="Live customer records with status and renewal state."
          action={
            <Button onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? "Close" : "Add customer"}
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <Select value={status} onChange={(event) => setStatus(event.target.value as CustomerStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="at_risk">At risk</option>
                <option value="blacklisted">Blacklisted</option>
              </Select>
              <Input
                placeholder="Search by name, email, or ref"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {showCreate ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-[#f7faf6] p-4 md:grid-cols-2">
                <Input
                  placeholder="Customer ref"
                  value={draft.customerRef}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, customerRef: event.target.value }))
                  }
                />
                <Select
                  value={draft.market}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, market: event.target.value }))
                  }
                >
                  {["NGN", "GHS", "KES", "ZMW", "UGX", "TZS"].map((market) => (
                    <option key={market} value={market}>
                      {market}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Customer name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <Input
                  placeholder="Customer email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <div className="md:col-span-2">
                  <Button
                    tone="brand"
                    onClick={() => void handleCreate()}
                    disabled={
                      isBusy === "create-customer" ||
                      !draft.customerRef.trim() ||
                      !draft.name.trim() ||
                      !draft.email.trim()
                    }
                  >
                    {isBusy === "create-customer" ? "Saving..." : "Save customer"}
                  </Button>
                </div>
              </div>
            ) : null}

            {message ? <p className="text-sm text-[color:var(--brand)]">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-[#a8382b]">{errorMessage}</p> : null}

            <Table columns={["Customer", "Market", "Subscriptions", "Next renewal", "Status"]}>
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="text-left"
                  onClick={() => setSelectedId(customer.id)}
                >
                  <TableRow columns={5}>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{customer.email}</p>
                    </div>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                      {customer.market}
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {customer.subscriptionCount} active
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {formatDate(customer.nextRenewalAt)}
                    </p>
                    <div>
                      <StatusBadge value={customer.status}>
                        {customer.status === "at_risk" ? "At risk" : customer.status.replace(/_/g, " ")}
                      </StatusBadge>
                    </div>
                  </TableRow>
                </button>
              ))}
            </Table>
          </div>
        </Card>

        <Card title={selectedCustomer?.name ?? "Customer profile"} description={selectedCustomer?.email ?? "Select a customer to inspect live billing state."}>
          {selectedCustomer ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Market" value={selectedCustomer.market} />
                <Field label="Monthly volume" value={formatCurrency(selectedCustomer.monthlyVolumeUsdc)} />
                <Field label="Next renewal" value={formatDate(selectedCustomer.nextRenewalAt)} />
                <Field label="Last charge" value={formatDate(selectedCustomer.lastChargeAt)} />
                <Field label="Payment method" value={selectedCustomer.paymentMethodState.replace(/_/g, " ")} />
                <Field label="Billing state" value={selectedCustomer.billingState.replace(/_/g, " ")} />
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedCustomer.status === "paused" ? (
                  <Button
                    tone="brand"
                    disabled={isBusy === "resume"}
                    onClick={() => void handlePauseResume("resume")}
                  >
                    {isBusy === "resume" ? "Resuming..." : "Resume billing"}
                  </Button>
                ) : (
                  <Button disabled={isBusy === "pause"} onClick={() => void handlePauseResume("pause")}>
                    {isBusy === "pause" ? "Pausing..." : "Pause billing"}
                  </Button>
                )}
                {selectedCustomer.status !== "blacklisted" ? (
                  <Button
                    tone="danger"
                    disabled={isBusy === "blacklist"}
                    onClick={() => void handleBlacklist()}
                  >
                    {isBusy === "blacklist" ? "Blocking..." : "Blacklist"}
                  </Button>
                ) : null}
              </div>

              {selectedCustomer.blacklistReason ? (
                <div className="rounded-2xl border border-[#eed0cb] bg-[#fff7f6] px-4 py-4 text-sm leading-7 text-[#8b4338]">
                  {selectedCustomer.blacklistReason}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              No customer record matches the current filter.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
