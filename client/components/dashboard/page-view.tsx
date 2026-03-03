"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DashboardPageContent } from "@/types/dashboard";

import { cn } from "@/lib/utils";

type DashboardPageViewProps = {
  page: DashboardPageContent;
};

export function DashboardPageView({ page }: DashboardPageViewProps) {
  if (page.key === "customers" || page.key === "plans") {
    return (
      <section className="space-y-6">
        {page.key === "customers" ? <CustomersSurface /> : <PlansSurface />}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <MetricRow stats={page.stats} />
      {renderMockSurface(page)}
    </section>
  );
}

function MetricRow({ stats }: Pick<DashboardPageContent, "stats">) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "rounded-[1.6rem] border p-4",
            stat.tone === "brand"
              ? "border-[#0c4a27]/10 bg-[#0c4a27] text-[#d9f6bc]"
              : "border-[color:var(--line)] bg-white/82 text-[color:var(--ink)]",
          )}
        >
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              stat.tone === "brand" ? "text-[#d9f6bc]/76" : "text-[color:var(--muted)]",
            )}
          >
            {stat.label}
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em]">
            {stat.value}
          </p>
          <p
            className={cn(
              "mt-2 text-sm leading-6",
              stat.tone === "brand" ? "text-[#d9f6bc]/78" : "text-[color:var(--muted)]",
            )}
          >
            {stat.note}
          </p>
        </div>
      ))}
    </div>
  );
}

function renderMockSurface(page: DashboardPageContent) {
  switch (page.key) {
    case "overview":
      return <OverviewSurface />;
    case "customers":
      return <CustomersSurface />;
    case "plans":
      return <PlansSurface />;
    case "subscriptions":
      return <SubscriptionsSurface />;
    case "payments":
      return <PaymentsSurface />;
    case "treasury":
      return <TreasurySurface />;
    case "teams":
      return <TeamsSurface />;
    case "developers":
      return <DevelopersSurface />;
    case "settings":
      return <SettingsSurface />;
  }
}

function OverviewSurface() {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card title="Collection trend" description="Billed vs settled for the current cycle.">
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0c4a27]" />
                Billed
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#b5d39f]" />
                Settled
              </span>
            </div>
            <div className="grid h-56 grid-cols-8 items-end gap-3">
              {[
                { label: "Mon", billed: 42, settled: 28 },
                { label: "Tue", billed: 64, settled: 47 },
                { label: "Wed", billed: 58, settled: 41 },
                { label: "Thu", billed: 76, settled: 59 },
                { label: "Fri", billed: 70, settled: 54 },
                { label: "Sat", billed: 88, settled: 69 },
                { label: "Sun", billed: 82, settled: 61 },
                { label: "Now", billed: 94, settled: 78 },
              ].map((point, index) => (
                <div key={point.label} className="flex h-full flex-col justify-end gap-3">
                  <div className="flex h-full items-end justify-center gap-2">
                    <div className="flex h-full items-end">
                      <div
                        className={cn(
                          "w-4 rounded-t-full bg-[#0c4a27] sm:w-5",
                          index === 7 ? "opacity-100" : "opacity-92",
                        )}
                        style={{ height: `${point.billed}%` }}
                      />
                    </div>
                    <div className="flex h-full items-end">
                      <div
                        className="w-3 rounded-t-full bg-[#b5d39f] sm:w-4"
                        style={{ height: `${point.settled}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Upcoming renewals">
          <div className="space-y-3">
            <RenewalCheckpoint
              time="Tomorrow, 09:00 UTC"
              title="Core Plan"
              metric="184 due"
            />
            <RenewalCheckpoint
              time="Tomorrow, 12:00 UTC"
              title="Usage Flex"
              metric="3 pending"
            />
            <RenewalCheckpoint
              time="Friday, 08:00 UTC"
              title="Scale Annual"
              metric="27 due"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card title="Market mix" description="Volume concentration by billing market.">
          <div className="space-y-4">
            <ProgressRow label="NGN" value="38%" width="38%" />
            <ProgressRow label="KES" value="24%" width="24%" />
            <ProgressRow label="GHS" value="14%" width="14%" />
            <ProgressRow label="ZMW" value="11%" width="11%" />
          </div>
        </Card>

        <Card title="Quick actions" description="Jump into the next operator task.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickActionButton
              label="Add customer"
              detail="Create a new account profile"
              icon="user-plus"
            />
            <QuickActionButton
              label="Create plan"
              detail="Set pricing and billing rules"
              icon="plus"
            />
            <QuickActionButton
              label="Review renewals"
              detail="Check upcoming billing runs"
              icon="clock"
            />
            <QuickActionButton
              label="Open treasury"
              detail="View settlement and sweep state"
              icon="wallet"
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function RenewalCheckpoint({
  time,
  title,
  metric,
  tone = "neutral",
}: {
  time: string;
  title: string;
  metric: string;
  tone?: "brand" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4",
        tone === "brand"
          ? "border-[#0c4a27]/10 bg-[#edf7eb]"
          : "border-[color:var(--line)] bg-white",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.14em]",
              tone === "brand" ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]",
            )}
          >
            {time}
          </p>
          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{title}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]",
            tone === "brand"
              ? "bg-[#0c4a27] text-[#d9f6bc]"
              : "border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--brand)]",
          )}
        >
          {metric}
        </span>
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  detail,
  icon,
}: {
  label: string;
  detail: string;
  icon: "user-plus" | "plus" | "clock" | "wallet";
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0c4a27]/15 hover:bg-[#f7fbf5]"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf7eb] text-[color:var(--brand)]">
        <QuickActionIcon icon={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[color:var(--muted)]">{detail}</span>
      </span>
    </button>
  );
}

function QuickActionIcon({
  icon,
}: {
  icon: "user-plus" | "plus" | "clock" | "wallet";
}) {
  if (icon === "user-plus") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M15 19v-1.2c0-1.7-1.9-3-4.3-3s-4.2 1.3-4.2 3V19" strokeLinecap="round" />
        <circle cx="10.8" cy="8.2" r="3.2" />
        <path d="M18.5 8v5" strokeLinecap="round" />
        <path d="M16 10.5h5" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="12" r="7.2" />
        <path d="M12 8.5v4.3l2.8 1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "wallet") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path
          d="M5.5 7.5h10.8a2.7 2.7 0 0 1 2.7 2.7v5.3a2.5 2.5 0 0 1-2.5 2.5H7.1A2.6 2.6 0 0 1 4.5 15.4V8.5a1.9 1.9 0 0 1 1-1.7l6-3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M15.7 12h3.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 5.2v13.6" strokeLinecap="round" />
      <path d="M5.2 12h13.6" strokeLinecap="round" />
    </svg>
  );
}

type CustomerFilter = "All" | "At risk" | "Active" | "Paused";

type CustomerRecord = {
  id: string;
  name: string;
  email: string;
  market: string;
  lifecycle: "Active" | "At risk" | "Paused";
  plans: string[];
  nextRenewal: string;
  lastCharge: string;
  paymentMethod: string;
  paymentMethodTone: "brand" | "warning";
};

type NewCustomerDraft = {
  name: string;
  email: string;
  market: string;
  plan: string;
};

const customerRecords: CustomerRecord[] = [
  {
    id: "axel-telecom",
    name: "Axel Telecom",
    email: "finance@axeltelecom.com",
    market: "NGN",
    lifecycle: "Active",
    plans: ["Core Plan", "Usage Flex"],
    nextRenewal: "Tomorrow",
    lastCharge: "Jun 05",
    paymentMethod: "Ready",
    paymentMethodTone: "brand",
  },
  {
    id: "mazi-clinic",
    name: "Mazi Clinic",
    email: "ops@maziclinic.com",
    market: "GHS",
    lifecycle: "At risk",
    plans: ["Core Plan", "Usage Flex"],
    nextRenewal: "Jun 11",
    lastCharge: "Jun 04",
    paymentMethod: "Update needed",
    paymentMethodTone: "warning",
  },
  {
    id: "geno-labs",
    name: "Geno Labs",
    email: "billing@genolabs.io",
    market: "KES",
    lifecycle: "Paused",
    plans: ["Scale Annual"],
    nextRenewal: "Paused",
    lastCharge: "May 29",
    paymentMethod: "On hold",
    paymentMethodTone: "warning",
  },
  {
    id: "sabi-retail",
    name: "Sabi Retail",
    email: "accounts@sabiretail.africa",
    market: "ZMW",
    lifecycle: "Active",
    plans: ["Core Plan", "Scale Annual"],
    nextRenewal: "Jun 13",
    lastCharge: "Jun 03",
    paymentMethod: "Ready",
    paymentMethodTone: "brand",
  },
];

function CustomersSurface() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(customerRecords);
  const [activeFilter, setActiveFilter] = useState<CustomerFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("mazi-clinic");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [draft, setDraft] = useState<NewCustomerDraft>({
    name: "",
    email: "",
    market: "NGN",
    plan: "Core Plan",
  });

  const filteredCustomers = customers.filter((customer) => {
    const matchesFilter =
      activeFilter === "All"
        ? true
        : activeFilter === "Active"
          ? customer.lifecycle === "Active"
          : activeFilter === "Paused"
            ? customer.lifecycle === "Paused"
            : customer.lifecycle === "At risk";

    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [customer.name, customer.email, customer.market, ...customer.plans]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredCustomers.length === 0) {
      return;
    }

    const currentStillVisible = filteredCustomers.some((customer) => customer.id === selectedCustomerId);

    if (!currentStillVisible) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [activeFilter, query, selectedCustomerId, filteredCustomers]);

  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
    (filteredCustomers.length > 0 ? filteredCustomers[0] : null);

  const activeCustomers = customers.filter((customer) => customer.lifecycle !== "Paused").length;
  const liveMarkets = new Set(customers.map((customer) => customer.market)).size;
  const attentionCount = customers.filter((customer) => customer.lifecycle === "At risk").length;
  const unassignedCount = customers.filter((customer) => customer.plans.length === 0).length;

  const attentionSummary = selectedCustomer
    ? selectedCustomer.paymentMethodTone === "warning"
      ? selectedCustomer.lifecycle === "Paused"
        ? "Billing is paused until the payment method is updated."
        : "Auto reminders and retries are already running."
        : "Billing is healthy and following the active plan rules."
    : null;

  function handleDraftChange<K extends keyof NewCustomerDraft>(key: K, value: NewCustomerDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAddCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const email = draft.email.trim();

    if (!name || !email) {
      return;
    }

    const nextCustomer: CustomerRecord = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      email,
      market: draft.market,
      lifecycle: "Active",
      plans: draft.plan ? [draft.plan] : [],
      nextRenewal: "Not scheduled",
      lastCharge: "No charges",
      paymentMethod: "Awaiting setup",
      paymentMethodTone: "warning",
    };

    setCustomers((current) => [nextCustomer, ...current]);
    setSelectedCustomerId(nextCustomer.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      name: "",
      email: "",
      market: "NGN",
      plan: "Core Plan",
    });
    setIsAddCustomerOpen(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CustomerMetricCard label="Billable customers" value={String(activeCustomers)} note="Ready to charge" tone="brand" />
        <CustomerMetricCard label="Live markets" value={String(liveMarkets)} note="Billing coverage" />
        <CustomerMetricCard label="Need attention" value={String(attentionCount)} note="Follow-up needed" />
        <CustomerMetricCard label="Need setup" value={String(unassignedCount)} note="No plan attached" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <Card title="Customers">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-[color:var(--muted)]"
                fill="none"
              >
                <circle cx="9" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M12.8 12.8L16 16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by customer, email, or plan"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Add customer
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {(["All", "At risk", "Active", "Paused"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                  activeFilter === tab
                    ? "bg-[#0c4a27] text-[#d9f6bc]"
                    : "border border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:bg-[#f7fbf5]",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No customers match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <CustomerListRow
                  key={customer.id}
                  customer={customer}
                  isSelected={customer.id === selectedCustomerId}
                  onSelect={() => setSelectedCustomerId(customer.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <DarkCard
          title={selectedCustomer ? selectedCustomer.name : "Customer details"}
          description={selectedCustomer?.email}
        >
          {selectedCustomer ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d9f6bc]">
                  {selectedCustomer.market}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    selectedCustomer.lifecycle === "At risk"
                      ? "bg-[#8a4b0f]/18 text-[#f6c887]"
                      : selectedCustomer.lifecycle === "Paused"
                        ? "bg-white/8 text-white/62"
                        : "bg-[#133726] text-[#7fe8ae]",
                  )}
                >
                  {selectedCustomer.lifecycle}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ProfileMiniStat label="Plans" value={String(selectedCustomer.plans.length)} />
                <ProfileMiniStat label="Next renewal" value={selectedCustomer.nextRenewal} />
                <ProfileMiniStat label="Last charge" value={selectedCustomer.lastCharge} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Payment method
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p
                    className={cn(
                      "text-sm font-semibold tracking-[-0.02em]",
                      selectedCustomer.paymentMethodTone === "warning"
                        ? "text-[#f6c887]"
                        : "text-[#d9f6bc]",
                    )}
                  >
                    {selectedCustomer.paymentMethod}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      selectedCustomer.lifecycle === "At risk"
                        ? "bg-[#8a4b0f]/18 text-[#f6c887]"
                        : selectedCustomer.lifecycle === "Paused"
                          ? "bg-white/8 text-white/62"
                          : "bg-[#133726] text-[#7fe8ae]",
                    )}
                  >
                    {selectedCustomer.lifecycle}
                  </span>
                </div>
                {attentionSummary ? (
                  <p className="mt-3 text-sm leading-6 text-white/62">{attentionSummary}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Plans
                </p>
                {selectedCustomer.plans.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCustomer.plans.map((plan) => (
                      <span
                        key={plan}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                      >
                        {plan}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-white/62">No plans attached yet.</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileActionLink href="/dashboard/subscriptions" label="View subscriptions" />
                <ProfileActionLink href="/dashboard/payments" label="View payment history" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Pick a customer from the list to review billing state and actions.
            </div>
          )}
        </DarkCard>
      </div>

      {isAddCustomerOpen ? (
        <CustomerModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsAddCustomerOpen(false)}
          onSubmit={handleAddCustomer}
        />
      ) : null}
    </>
  );
}

function CustomerMetricCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "brand" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border p-4",
        tone === "brand"
          ? "border-[#0c4a27]/10 bg-[#0c4a27] text-[#d9f6bc]"
          : "border-[color:var(--line)] bg-white/82 text-[color:var(--ink)]",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.16em]",
          tone === "brand" ? "text-[#d9f6bc]/76" : "text-[color:var(--muted)]",
        )}
      >
        {label}
      </p>
      <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em]">{value}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-6",
          tone === "brand" ? "text-[#d9f6bc]/78" : "text-[color:var(--muted)]",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function CustomerListRow({
  customer,
  isSelected,
  onSelect,
}: {
  customer: CustomerRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusTone =
    customer.lifecycle === "Active"
      ? "brand"
      : customer.lifecycle === "At risk"
        ? "warning"
        : "neutral";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200",
        isSelected
          ? "border-[#0c4a27]/14 bg-[#edf7eb]"
          : "border-[color:var(--line)] bg-white hover:border-[#0c4a27]/10 hover:bg-[#f7fbf5]",
      )}
    >
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.3fr)_auto_auto_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-[color:var(--brand)]">
            {customer.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
              {customer.name}
            </p>
            <p className="truncate text-sm text-[color:var(--muted)]">{customer.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-self-start">
          <CustomerMetaPill>{customer.market}</CustomerMetaPill>
        </div>

        <div className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)] md:justify-self-start">
          {customer.plans.length > 0
            ? `${customer.plans.length} plan${customer.plans.length === 1 ? "" : "s"}`
            : "No plan"}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-self-end">
          <CustomerMetaPill>{customer.nextRenewal}</CustomerMetaPill>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
              statusTone === "brand"
                ? "bg-[#dff7e6] text-[#0f8a47]"
                : statusTone === "warning"
                  ? "bg-[#8a4b0f]/12 text-[#8a4b0f]"
                  : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]",
            )}
          >
            {customer.lifecycle}
          </span>
        </div>
      </div>
    </button>
  );
}

function CustomerMetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
      {children}
    </span>
  );
}

function ProfileMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/6 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">{label}</p>
      <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  );
}

function ProfileActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white transition-all duration-200 hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

function CustomerModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewCustomerDraft;
  onChange: <K extends keyof NewCustomerDraft>(key: K, value: NewCustomerDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Add customer
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Create the customer record before attaching subscriptions and billing rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close add customer modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Business name
              </span>
              <input
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Mazi Clinic"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Billing email
              </span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => onChange("email", event.target.value)}
                placeholder="ops@maziclinic.com"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Market
              </span>
              <select
                value={draft.market}
                onChange={(event) => onChange("market", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {["NGN", "GHS", "KES", "ZMW"].map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Starter plan
              </span>
              <select
                value={draft.plan}
                onChange={(event) => onChange("plan", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                <option value="Core Plan">Core Plan</option>
                <option value="Usage Flex">Usage Flex</option>
                <option value="Scale Annual">Scale Annual</option>
                <option value="">No plan yet</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[color:var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Save customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type PlanStatus = "Live" | "Draft" | "Archived";
type PlanInterval = "Monthly" | "Quarterly" | "Annual" | "Metered";
type BillingMode = "Recurring" | "Metered";
type PlanFilter = "All" | PlanStatus;

type PlanRecord = {
  id: string;
  name: string;
  amount: string;
  interval: PlanInterval;
  status: PlanStatus;
  subscribers: number;
  trial: string;
  retryRule: string;
  billingMode: BillingMode;
  markets: string[];
  note: string;
};

type NewPlanDraft = {
  name: string;
  amount: string;
  interval: PlanInterval;
  billingMode: BillingMode;
  market: string;
};

const initialPlanRecords: PlanRecord[] = [
  {
    id: "core-plan",
    name: "Core Plan",
    amount: "49.00",
    interval: "Monthly",
    status: "Live",
    subscribers: 412,
    trial: "7 days",
    retryRule: "3 attempts / 5 days",
    billingMode: "Recurring",
    markets: ["NGN", "GHS", "KES", "ZMW"],
    note: "Baseline recurring plan for stable monthly billing.",
  },
  {
    id: "usage-flex",
    name: "Usage Flex",
    amount: "0.00",
    interval: "Metered",
    status: "Live",
    subscribers: 128,
    trial: "No trial",
    retryRule: "2 attempts / 3 days",
    billingMode: "Metered",
    markets: ["NGN", "KES", "RWF"],
    note: "Metered billing with usage approval before charge.",
  },
  {
    id: "scale-annual",
    name: "Scale Annual",
    amount: "499.00",
    interval: "Annual",
    status: "Draft",
    subscribers: 18,
    trial: "14 days",
    retryRule: "1 attempt / 7 days",
    billingMode: "Recurring",
    markets: ["GHS", "ZMW", "ZAR"],
    note: "High-value annual plan for larger contracts.",
  },
];

function PlansSurface() {
  const [plans, setPlans] = useState<PlanRecord[]>(initialPlanRecords);
  const [activeFilter, setActiveFilter] = useState<PlanFilter>("All");
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanRecords[0].id);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [draft, setDraft] = useState<NewPlanDraft>({
    name: "",
    amount: "49.00",
    interval: "Monthly",
    billingMode: "Recurring",
    market: "NGN",
  });

  const filteredPlans = plans.filter((plan) => (activeFilter === "All" ? true : plan.status === activeFilter));

  useEffect(() => {
    if (filteredPlans.length === 0) {
      return;
    }

    const currentStillVisible = filteredPlans.some((plan) => plan.id === selectedPlanId);

    if (!currentStillVisible) {
      setSelectedPlanId(filteredPlans[0].id);
    }
  }, [activeFilter, filteredPlans, selectedPlanId]);

  const selectedPlan = filteredPlans.find((plan) => plan.id === selectedPlanId) ?? filteredPlans[0] ?? null;

  const livePlanCount = plans.filter((plan) => plan.status === "Live").length;
  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.subscribers, 0);
  const meteredPlanCount = plans.filter((plan) => plan.billingMode === "Metered").length;
  const liveMarketCount = new Set(plans.flatMap((plan) => plan.markets)).size;

  function updateSelectedPlan(updater: (plan: PlanRecord) => PlanRecord) {
    if (!selectedPlan) {
      return;
    }

    setPlans((current) =>
      current.map((plan) => (plan.id === selectedPlan.id ? updater(plan) : plan)),
    );
  }

  function handlePlanFieldChange<K extends keyof PlanRecord>(key: K, value: PlanRecord[K]) {
    updateSelectedPlan((plan) => ({
      ...plan,
      [key]: value,
    }));
  }

  function toggleMarket(market: string) {
    updateSelectedPlan((plan) => {
      const nextMarkets = plan.markets.includes(market)
        ? plan.markets.filter((item) => item !== market)
        : [...plan.markets, market];

      return {
        ...plan,
        markets: nextMarkets,
      };
    });
  }

  function duplicateSelectedPlan() {
    if (!selectedPlan) {
      return;
    }

    const duplicate: PlanRecord = {
      ...selectedPlan,
      id: `${selectedPlan.id}-copy-${Date.now()}`,
      name: `${selectedPlan.name} Copy`,
      status: "Draft",
      subscribers: 0,
    };

    setPlans((current) => [duplicate, ...current]);
    setActiveFilter("All");
    setSelectedPlanId(duplicate.id);
  }

  function togglePlanArchiveState() {
    if (!selectedPlan) {
      return;
    }

    updateSelectedPlan((plan) => ({
      ...plan,
      status: plan.status === "Archived" ? "Live" : "Archived",
    }));
  }

  function handleDraftChange<K extends keyof NewPlanDraft>(key: K, value: NewPlanDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();

    if (!name) {
      return;
    }

    const nextPlan: PlanRecord = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      amount: draft.amount,
      interval: draft.interval,
      status: "Draft",
      subscribers: 0,
      trial: "No trial",
      retryRule: "3 attempts / 5 days",
      billingMode: draft.billingMode,
      markets: [draft.market],
      note: "New plan draft ready for rollout.",
    };

    setPlans((current) => [nextPlan, ...current]);
    setActiveFilter("All");
    setSelectedPlanId(nextPlan.id);
    setDraft({
      name: "",
      amount: "49.00",
      interval: "Monthly",
      billingMode: "Recurring",
      market: "NGN",
    });
    setIsCreatePlanOpen(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard label="Live plans" value={String(livePlanCount)} note="Ready for billing" tone="brand" />
        <PlanMetricCard label="Subscribers" value={String(totalSubscribers)} note="Across all plans" />
        <PlanMetricCard label="Metered plans" value={String(meteredPlanCount)} note="Usage-based billing" />
        <PlanMetricCard label="Markets" value={String(liveMarketCount)} note="Rollout coverage" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Plans">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["All", "Live", "Draft", "Archived"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                    activeFilter === tab
                      ? "bg-[#0c4a27] text-[#d9f6bc]"
                      : "border border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:bg-[#f7fbf5]",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCreatePlanOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Create plan
            </button>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No plans in this state.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => (
                <PlanCatalogRow
                  key={plan.id}
                  plan={plan}
                  isSelected={plan.id === selectedPlanId}
                  onSelect={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title={selectedPlan ? selectedPlan.name : "Plan details"}>
          {selectedPlan ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PlanStatusBadge status={selectedPlan.status} />
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  {selectedPlan.subscribers} subscribers
                </span>
              </div>

              <p className="text-sm leading-6 text-[color:var(--muted)]">{selectedPlan.note}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <PlanField label="Amount">
                  <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-[color:var(--muted)]">$</span>
                    <input
                      value={selectedPlan.amount}
                      onChange={(event) => handlePlanFieldChange("amount", event.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-[color:var(--ink)] outline-none"
                    />
                  </div>
                </PlanField>

                <PlanField label="Interval">
                  <select
                    value={selectedPlan.interval}
                    onChange={(event) => handlePlanFieldChange("interval", event.target.value as PlanInterval)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] outline-none"
                  >
                    {["Monthly", "Quarterly", "Annual", "Metered"].map((interval) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Trial">
                  <select
                    value={selectedPlan.trial}
                    onChange={(event) => handlePlanFieldChange("trial", event.target.value)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] outline-none"
                  >
                    {["No trial", "7 days", "14 days", "30 days"].map((trial) => (
                      <option key={trial} value={trial}>
                        {trial}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Retry rule">
                  <select
                    value={selectedPlan.retryRule}
                    onChange={(event) => handlePlanFieldChange("retryRule", event.target.value)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] outline-none"
                  >
                    {["1 attempt / 7 days", "2 attempts / 3 days", "3 attempts / 5 days"].map((rule) => (
                      <option key={rule} value={rule}>
                        {rule}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Billing mode">
                  <select
                    value={selectedPlan.billingMode}
                    onChange={(event) => handlePlanFieldChange("billingMode", event.target.value as BillingMode)}
                    className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--ink)] outline-none"
                  >
                    {["Recurring", "Metered"].map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </PlanField>
              </div>

              <div className="rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  Markets
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["NGN", "GHS", "KES", "ZMW", "RWF", "ZAR"].map((market) => {
                    const isActive = selectedPlan.markets.includes(market);

                    return (
                      <button
                        key={market}
                        type="button"
                        onClick={() => toggleMarket(market)}
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                          isActive
                            ? "bg-[#0c4a27] text-[#d9f6bc]"
                            : "border border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:bg-[#edf7eb]",
                        )}
                      >
                        {market}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PlanActionButton label="Duplicate plan" onClick={duplicateSelectedPlan} />
                <PlanActionButton
                  label={selectedPlan.status === "Archived" ? "Restore plan" : "Archive plan"}
                  onClick={togglePlanArchiveState}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              Select a plan to review pricing and rollout settings.
            </div>
          )}
        </Card>
      </div>

      {isCreatePlanOpen ? (
        <CreatePlanModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsCreatePlanOpen(false)}
          onSubmit={handleCreatePlan}
        />
      ) : null}
    </>
  );
}

function SubscriptionsSurface() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Card title="Renewal queue" description="Sorted by next billing date.">
        <TableHeader columns={["Customer", "Plan", "Next bill", "State"]} />
        <TableRow columns={["Axel Telecom", "Growth", "Jun 06", "Active"]} tone="brand" />
        <TableRow columns={["Geno Labs", "Scale", "Jun 06", "Past due"]} tone="warning" />
        <TableRow columns={["Mazi Clinic", "Growth", "Jun 11", "Needs update"]} tone="warning" />
        <TableRow columns={["Sabi Retail", "Enterprise", "Jun 13", "Paused"]} />
      </Card>

      <Card title="Lifecycle" description="Selected subscription">
        <div className="space-y-3">
          <TimelineItem title="Created" body="Growth plan attached on May 03." tone="brand" />
          <TimelineItem title="May 10" body="Renewal paid successfully in local fiat." />
          <TimelineItem title="May 17" body="Retry succeeded after low-balance failure." />
          <TimelineItem title="Next" body="Meter snapshot required before the next renewal." />
        </div>
      </Card>
    </div>
  );
}

function PaymentsSurface() {
  return (
    <>
      <Card title="Charge ledger" description="Every attempt, with state and settlement context.">
        <TableHeader columns={["Reference", "Customer", "Local", "USDC", "Status"]} />
        <TableRow columns={["INV-1042", "Axel Telecom", "₦78,500", "50.00", "Settled"]} tone="brand" />
        <TableRow columns={["INV-1041", "Mazi Clinic", "GH₵1,180", "74.60", "Pending"]} />
        <TableRow columns={["INV-1040", "Geno Labs", "KSh9,100", "71.20", "Failed"]} tone="warning" />
        <TableRow columns={["INV-1039", "Sabi Retail", "ZK5,400", "198.30", "Settled"]} tone="brand" />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card title="Retry queue" description="Highest-value failed charges first.">
          <TimelineItem title="Geno Labs" body="Retry allowed in 11 hours." tone="warning" />
          <TimelineItem title="Mazi Clinic" body="Needs payment method update." />
          <TimelineItem title="Sparrow AI" body="Manual review after limit rejection." />
        </Card>
        <DarkCard title="Daily settlement view" description="Where payment operations meet treasury.">
          <div className="space-y-4">
            <StatusLine label="Settled" value="186 charges" tone="brand" />
            <StatusLine label="Pending" value="12 charges" />
            <StatusLine label="Failed" value="9 charges" tone="warning" />
          </div>
        </DarkCard>
      </div>
    </>
  );
}

function TreasurySurface() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card title="Settlement batches" description="Recent payout-ready groups.">
        <TableHeader columns={["Batch", "Gross", "Net", "State"]} />
        <TableRow columns={["248", "21,440", "18,420", "Confirming"]} />
        <TableRow columns={["247", "14,180", "12,900", "Settled"]} tone="brand" />
        <TableRow columns={["246", "8,020", "7,450", "Settled"]} tone="brand" />
      </Card>

      <DarkCard title="Wallet destinations" description="Treasury endpoints">
        <div className="space-y-3">
          <WalletRow name="Primary settlement" address="0x8A12...61F4" active />
          <WalletRow name="Reserve wallet" address="0x5C88...A104" />
          <WalletRow name="Ops float" address="0xF120...90DE" />
        </div>
      </DarkCard>
    </div>
  );
}

function TeamsSurface() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
      <Card title="Team directory" description="Operators, finance, and support in one workspace.">
        <TableHeader columns={["Member", "Role", "Last active", "Access"]} />
        <TableRow columns={["Ada N.", "Owner", "2 min ago", "Full"]} tone="brand" />
        <TableRow columns={["Kola M.", "Operations", "18 min ago", "Billing"]} />
        <TableRow columns={["Jules A.", "Finance", "1 hour ago", "Treasury"]} />
        <TableRow columns={["Mina S.", "Developer", "3 hours ago", "API + webhooks"]} />
      </Card>

      <Card title="Role split" description="Access by function">
        <div className="space-y-4">
          <ProgressRow label="Owner / Admin" value="4" width="28%" />
          <ProgressRow label="Operations" value="5" width="36%" />
          <ProgressRow label="Finance" value="3" width="21%" />
          <ProgressRow label="Developer" value="2" width="15%" />
        </div>
      </Card>
    </div>
  );
}

function DevelopersSurface() {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-3">
        <DarkCard title="Live key" description="rk_live_••••••4E9A">
          <StatusLine label="Scope" value="Billing + payments" />
          <StatusLine label="Last used" value="4 min ago" />
        </DarkCard>
        <Card title="Webhook health" description="3 active endpoints">
          <StatusLine label="Successful deliveries" value="99.2%" tone="brand" />
          <StatusLine label="Failed deliveries" value="14 today" tone="warning" />
        </Card>
        <Card title="Sandbox" description="Ready for integration tests">
          <StatusLine label="Mode" value="Test" />
          <StatusLine label="Sample payloads" value="Available" tone="brand" />
        </Card>
      </div>

      <Card title="Recent event stream" description="Latest webhook activity">
        <TableHeader columns={["Event", "Object", "Endpoint", "Result"]} />
        <TableRow columns={["payment.settled", "INV-1042", "billing-prod", "Delivered"]} tone="brand" />
        <TableRow columns={["subscription.retry_scheduled", "SUB-280", "ops-sync", "Delivered"]} tone="brand" />
        <TableRow columns={["payment.failed", "INV-1040", "billing-prod", "Retried"]} />
        <TableRow columns={["subscription.updated", "SUB-244", "sandbox-hook", "Pending"]} />
      </Card>
    </>
  );
}

function SettingsSurface() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card title="Business profile" description="Customer-facing workspace identity.">
        <div className="grid gap-3 md:grid-cols-2">
          <FieldMock label="Business name" value="Renew Labs" />
          <FieldMock label="Support email" value="hello@renew.sh" />
          <FieldMock label="Default market" value="NGN" />
          <FieldMock label="Settlement chain" value="Avalanche" />
        </div>
      </Card>

      <Card title="Controls" description="High-signal workspace settings.">
        <ToggleRow label="Auto retries" enabled />
        <ToggleRow label="Meter approval required" enabled />
        <ToggleRow label="Export daily settlement" enabled={false} />
        <ToggleRow label="Developer alerts" enabled />
      </Card>
    </div>
  );
}

type CardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function Card({ title, description, children }: CardProps) {
  return (
    <div className="rounded-[2rem] border border-[color:var(--line)] bg-white/82 p-5 shadow-[0_18px_70px_rgba(16,32,20,0.04)] sm:p-6">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{description}</p>
      ) : null}
      <div className={cn(description ? "mt-5" : "mt-4")}>{children}</div>
    </div>
  );
}

function DarkCard({ title, description, children }: CardProps) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#121312] p-5 text-white sm:p-6">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.05em]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-white/70">{description}</p> : null}
      <div className={cn(description ? "mt-5" : "mt-4")}>{children}</div>
    </div>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div
      className={cn(
        "hidden gap-3 rounded-2xl border border-[color:var(--line)] bg-[#edf7eb] px-4 py-3 md:grid",
        getDesktopGridClass(columns.length),
      )}
    >
      {columns.map((column) => (
        <p key={column} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
          {column}
        </p>
      ))}
    </div>
  );
}

function TableRow({
  columns,
  tone = "neutral",
}: {
  columns: string[];
  tone?: "brand" | "warning" | "neutral";
}) {
  return (
    <div
      className={cn(
        "mt-3 grid gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4",
        getDesktopGridClass(columns.length),
      )}
    >
      {columns.map((column, index) => (
        <p
          key={`${column}-${index}`}
          className={cn(
            "text-sm leading-6",
            index === columns.length - 1
              ? tone === "brand"
                ? "font-semibold text-[#0c4a27]"
                : tone === "warning"
                  ? "font-semibold text-[#8a4b0f]"
                  : "font-semibold text-[color:var(--ink)]"
              : index === 0
                ? "font-semibold text-[color:var(--ink)]"
                : "text-[color:var(--muted)]",
          )}
        >
          {column}
        </p>
      ))}
    </div>
  );
}

function getDesktopGridClass(columnCount: number) {
  switch (columnCount) {
    case 3:
      return "md:grid-cols-3";
    case 5:
      return "md:grid-cols-5";
    default:
      return "md:grid-cols-4";
  }
}

function TimelineItem({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "brand" | "warning" | "neutral";
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[color:var(--line)] bg-white/65 px-4 py-4">
      <span
        className={cn(
          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
          tone === "brand" ? "bg-[#0c4a27]" : tone === "warning" ? "bg-[#b86a1a]" : "bg-black/15",
        )}
      />
      <div>
        <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{title}</p>
        <p className="mt-1 text-sm leading-7 text-[color:var(--muted)]">{body}</p>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[color:var(--ink)]">{label}</span>
        <span className="text-[color:var(--muted)]">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#dde4db]">
        <div className="h-2 rounded-full bg-[#0c4a27]" style={{ width }} />
      </div>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "brand" | "warning" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
      <span className="text-sm text-white/70">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold",
          tone === "brand"
            ? "text-[#d9f6bc]"
            : tone === "warning"
              ? "text-[#f5c98f]"
              : "text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PlanMetricCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "brand" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border p-4",
        tone === "brand"
          ? "border-[#0c4a27]/10 bg-[#0c4a27] text-[#d9f6bc]"
          : "border-[color:var(--line)] bg-white/82 text-[color:var(--ink)]",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.16em]",
          tone === "brand" ? "text-[#d9f6bc]/76" : "text-[color:var(--muted)]",
        )}
      >
        {label}
      </p>
      <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em]">{value}</p>
      <p
        className={cn(
          "mt-2 text-sm leading-6",
          tone === "brand" ? "text-[#d9f6bc]/78" : "text-[color:var(--muted)]",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function PlanCatalogRow({
  plan,
  isSelected,
  onSelect,
}: {
  plan: PlanRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200",
        isSelected
          ? "border-[#0c4a27]/14 bg-[#edf7eb]"
          : "border-[color:var(--line)] bg-white hover:border-[#0c4a27]/10 hover:bg-[#f7fbf5]",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{plan.name}</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{plan.note}</p>
          </div>
          <PlanStatusBadge status={plan.status} compact />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
            ${plan.amount}
          </span>
          <span className="text-sm text-[color:var(--muted)]">/{plan.interval.toLowerCase()}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PlanMetaPill>{plan.billingMode}</PlanMetaPill>
          <PlanMetaPill>{plan.subscribers} subscribers</PlanMetaPill>
          <PlanMetaPill>{plan.markets.length} markets</PlanMetaPill>
        </div>
      </div>
    </button>
  );
}

function PlanStatusBadge({
  status,
  compact = false,
}: {
  status: PlanStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Live"
          ? "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Draft"
            ? "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : "border border-[#e2e6e0] bg-[#f3f5f2] text-[color:var(--muted)]",
        compact ? "px-2.5 py-1.5" : "",
      )}
    >
      {status}
    </span>
  );
}

function PlanMetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
      {children}
    </span>
  );
}

function PlanField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function PlanActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)] transition-all duration-200 hover:bg-[#f7fbf5]"
    >
      {label}
    </button>
  );
}

function CreatePlanModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewPlanDraft;
  onChange: <K extends keyof NewPlanDraft>(key: K, value: NewPlanDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Create plan
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Set the pricing, cadence, and first rollout market.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close create plan modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField label="Plan name">
              <input
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Core Plan"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>

            <PlanField label="Amount">
              <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <span className="text-sm font-semibold text-[color:var(--muted)]">$</span>
                <input
                  value={draft.amount}
                  onChange={(event) => onChange("amount", event.target.value)}
                  className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none"
                />
              </div>
            </PlanField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <PlanField label="Interval">
              <select
                value={draft.interval}
                onChange={(event) => onChange("interval", event.target.value as PlanInterval)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {["Monthly", "Quarterly", "Annual", "Metered"].map((interval) => (
                  <option key={interval} value={interval}>
                    {interval}
                  </option>
                ))}
              </select>
            </PlanField>

            <PlanField label="Billing mode">
              <select
                value={draft.billingMode}
                onChange={(event) => onChange("billingMode", event.target.value as BillingMode)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {["Recurring", "Metered"].map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </PlanField>

            <PlanField label="First market">
              <select
                value={draft.market}
                onChange={(event) => onChange("market", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {["NGN", "GHS", "KES", "ZMW", "RWF", "ZAR"].map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </PlanField>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[color:var(--muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Save plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldMock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
        {value}
      </p>
    </div>
  );
}

function WalletRow({
  name,
  address,
  active = false,
}: {
  name: string;
  address: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{name}</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            active ? "bg-[#d9f6bc]/10 text-[#d9f6bc]" : "bg-white/8 text-white/68",
          )}
        >
          {active ? "Primary" : "Standby"}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/68">{address}</p>
    </div>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
      <span className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{label}</span>
      <span
        className={cn(
          "inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors",
          enabled ? "bg-[#0c4a27]" : "bg-black/10",
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white transition-transform",
            enabled ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </div>
  );
}
