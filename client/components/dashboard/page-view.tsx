"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DashboardPageContent } from "@/types/dashboard";

import { cn } from "@/lib/utils";

type DashboardPageViewProps = {
  page: DashboardPageContent;
};

export function DashboardPageView({ page }: DashboardPageViewProps) {
  if (
    page.key === "customers" ||
    page.key === "plans" ||
    page.key === "subscriptions" ||
    page.key === "payments" ||
    page.key === "treasury" ||
    page.key === "developers" ||
    page.key === "teams"
  ) {
    return (
      <section className="space-y-6">
        {page.key === "customers" ? (
          <CustomersSurface />
        ) : page.key === "plans" ? (
          <PlansSurface />
        ) : page.key === "subscriptions" ? (
          <SubscriptionsSurface />
        ) : page.key === "payments" ? (
          <PaymentsSurface />
        ) : page.key === "treasury" ? (
          <TreasurySurface />
        ) : page.key === "developers" ? (
          <DevelopersSurface />
        ) : (
          <TeamsSurface />
        )}
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
    case "settings":
      return <SettingsSurface />;
    default:
      return null;
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
              <DetailMetaRow>
                <DarkMetaPill tone="brand">{selectedCustomer.market}</DarkMetaPill>
                <CustomerLifecycleBadge lifecycle={selectedCustomer.lifecycle} dark />
              </DetailMetaRow>

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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
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
            <div className="max-h-[44rem] space-y-3 overflow-y-auto pr-1">
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

        <SidePanel title={selectedPlan ? selectedPlan.name : "Plan details"}>
          {selectedPlan ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <PlanStatusBadge status={selectedPlan.status} dark />
                <DarkMetaPill>{selectedPlan.subscribers} subscribers</DarkMetaPill>
              </DetailMetaRow>

              <p className="text-sm leading-6 text-white/70">{selectedPlan.note}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <PlanField label="Amount" dark>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <span className="text-sm font-semibold text-white/56">$</span>
                    <input
                      value={selectedPlan.amount}
                      onChange={(event) => handlePlanFieldChange("amount", event.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none"
                    />
                  </div>
                </PlanField>

                <PlanField label="Interval" dark>
                  <select
                    value={selectedPlan.interval}
                    onChange={(event) => handlePlanFieldChange("interval", event.target.value as PlanInterval)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {["Monthly", "Quarterly", "Annual", "Metered"].map((interval) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Trial" dark>
                  <select
                    value={selectedPlan.trial}
                    onChange={(event) => handlePlanFieldChange("trial", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {["No trial", "7 days", "14 days", "30 days"].map((trial) => (
                      <option key={trial} value={trial}>
                        {trial}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Retry rule" dark>
                  <select
                    value={selectedPlan.retryRule}
                    onChange={(event) => handlePlanFieldChange("retryRule", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {["1 attempt / 7 days", "2 attempts / 3 days", "3 attempts / 5 days"].map((rule) => (
                      <option key={rule} value={rule}>
                        {rule}
                      </option>
                    ))}
                  </select>
                </PlanField>

                <PlanField label="Billing mode" dark>
                  <select
                    value={selectedPlan.billingMode}
                    onChange={(event) => handlePlanFieldChange("billingMode", event.target.value as BillingMode)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {["Recurring", "Metered"].map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </PlanField>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
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
                            : "border border-white/10 bg-white/6 text-white/70 hover:bg-white/10",
                        )}
                      >
                        {market}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PlanActionButton label="Duplicate plan" onClick={duplicateSelectedPlan} dark />
                <PlanActionButton
                  label={selectedPlan.status === "Archived" ? "Restore plan" : "Archive plan"}
                  onClick={togglePlanArchiveState}
                  dark
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-8 text-center text-sm text-white/66">
              Select a plan to review pricing and rollout settings.
            </div>
          )}
        </SidePanel>
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

type SubscriptionFilter = "All" | "Active" | "At risk" | "Paused";
type SubscriptionLifecycle = Exclude<SubscriptionFilter, "All">;

type SubscriptionRecord = {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  market: string;
  status: SubscriptionLifecycle;
  nextBill: string;
  lastCharge: string;
  retryRule: string;
  billingMode: BillingMode;
  amount: string;
  interval: PlanInterval;
  note: string;
};

type NewSubscriptionDraft = {
  customerName: string;
  customerEmail: string;
  planName: string;
  market: string;
  amount: string;
  interval: PlanInterval;
  billingMode: BillingMode;
};

const initialSubscriptionRecords: SubscriptionRecord[] = [
  {
    id: "axel-core",
    customerName: "Axel Telecom",
    customerEmail: "finance@axeltelecom.com",
    planName: "Core Plan",
    market: "NGN",
    status: "Active",
    nextBill: "Jun 06",
    lastCharge: "Jun 01",
    retryRule: "3 attempts / 5 days",
    billingMode: "Recurring",
    amount: "49.00",
    interval: "Monthly",
    note: "Baseline monthly subscription for the primary operator account.",
  },
  {
    id: "mazi-usage-flex",
    customerName: "Mazi Clinic",
    customerEmail: "ops@maziclinic.com",
    planName: "Usage Flex",
    market: "GHS",
    status: "At risk",
    nextBill: "Jun 11",
    lastCharge: "Jun 04",
    retryRule: "2 attempts / 3 days",
    billingMode: "Metered",
    amount: "0.00",
    interval: "Metered",
    note: "Usage charges are waiting on final meter approval before billing.",
  },
  {
    id: "geno-scale-annual",
    customerName: "Geno Labs",
    customerEmail: "billing@genolabs.io",
    planName: "Scale Annual",
    market: "KES",
    status: "Paused",
    nextBill: "Paused",
    lastCharge: "May 29",
    retryRule: "1 attempt / 7 days",
    billingMode: "Recurring",
    amount: "499.00",
    interval: "Annual",
    note: "Subscription is paused while procurement completes approval.",
  },
  {
    id: "sabi-core",
    customerName: "Sabi Retail",
    customerEmail: "accounts@sabiretail.africa",
    planName: "Core Plan",
    market: "ZMW",
    status: "Active",
    nextBill: "Jun 13",
    lastCharge: "Jun 03",
    retryRule: "3 attempts / 5 days",
    billingMode: "Recurring",
    amount: "49.00",
    interval: "Monthly",
    note: "Standard monthly renewal with automatic retries enabled.",
  },
];

function SubscriptionsSurface() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(initialSubscriptionRecords);
  const [activeFilter, setActiveFilter] = useState<SubscriptionFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(initialSubscriptionRecords[0].id);
  const [isCreateSubscriptionOpen, setIsCreateSubscriptionOpen] = useState(false);
  const [draft, setDraft] = useState<NewSubscriptionDraft>({
    customerName: "",
    customerEmail: "",
    planName: "Core Plan",
    market: "NGN",
    amount: "49.00",
    interval: "Monthly",
    billingMode: "Recurring",
  });

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesFilter = activeFilter === "All" ? true : subscription.status === activeFilter;

    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [
            subscription.customerName,
            subscription.customerEmail,
            subscription.planName,
            subscription.market,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredSubscriptions.length === 0) {
      return;
    }

    const currentStillVisible = filteredSubscriptions.some(
      (subscription) => subscription.id === selectedSubscriptionId,
    );

    if (!currentStillVisible) {
      setSelectedSubscriptionId(filteredSubscriptions[0].id);
    }
  }, [activeFilter, filteredSubscriptions, query, selectedSubscriptionId]);

  const selectedSubscription =
    filteredSubscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ??
    filteredSubscriptions[0] ??
    null;

  const activeCount = subscriptions.filter((subscription) => subscription.status === "Active").length;
  const atRiskCount = subscriptions.filter((subscription) => subscription.status === "At risk").length;
  const pausedCount = subscriptions.filter((subscription) => subscription.status === "Paused").length;
  const meteredCount = subscriptions.filter((subscription) => subscription.billingMode === "Metered").length;

  function updateSelectedSubscription(updater: (subscription: SubscriptionRecord) => SubscriptionRecord) {
    if (!selectedSubscription) {
      return;
    }

    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === selectedSubscription.id ? updater(subscription) : subscription,
      ),
    );
  }

  function handleSubscriptionFieldChange<K extends keyof SubscriptionRecord>(
    key: K,
    value: SubscriptionRecord[K],
  ) {
    updateSelectedSubscription((subscription) => ({
      ...subscription,
      [key]: value,
    }));
  }

  function toggleSubscriptionState() {
    if (!selectedSubscription) {
      return;
    }

    updateSelectedSubscription((subscription) => ({
      ...subscription,
      status: subscription.status === "Paused" ? "Active" : "Paused",
      nextBill: subscription.status === "Paused" ? "Jun 20" : "On hold",
      note:
        subscription.status === "Paused"
          ? "Billing resumes on the next scheduled cycle with automatic retries restored."
          : "Subscription is paused and removed from the next billing run until it is resumed.",
    }));
  }

  function handleDraftChange<K extends keyof NewSubscriptionDraft>(
    key: K,
    value: NewSubscriptionDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreateSubscription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const customerName = draft.customerName.trim();
    const customerEmail = draft.customerEmail.trim();

    if (!customerName || !customerEmail) {
      return;
    }

    const nextSubscription: SubscriptionRecord = {
      id: `${customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      customerName,
      customerEmail,
      planName: draft.planName,
      market: draft.market,
      status: "Active",
      nextBill: "Jun 20",
      lastCharge: "Not billed",
      retryRule: "3 attempts / 5 days",
      billingMode: draft.billingMode,
      amount: draft.amount,
      interval: draft.interval,
      note:
        draft.billingMode === "Metered"
          ? "Usage will accumulate until the first metered billing checkpoint is approved."
          : "New subscription is ready for the first billing cycle.",
    };

    setSubscriptions((current) => [nextSubscription, ...current]);
    setSelectedSubscriptionId(nextSubscription.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      customerName: "",
      customerEmail: "",
      planName: "Core Plan",
      market: "NGN",
      amount: "49.00",
      interval: "Monthly",
      billingMode: "Recurring",
    });
    setIsCreateSubscriptionOpen(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard label="Active" value={String(activeCount)} note="Billing as scheduled" tone="brand" />
        <PlanMetricCard label="At risk" value={String(atRiskCount)} note="Need intervention" />
        <PlanMetricCard label="Paused" value={String(pausedCount)} note="Billing on hold" />
        <PlanMetricCard label="Metered" value={String(meteredCount)} note="Usage-based billing" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Subscriptions">
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
                placeholder="Search by customer or plan"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsCreateSubscriptionOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Create subscription
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {(["All", "Active", "At risk", "Paused"] as const).map((tab) => (
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

          {filteredSubscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No subscriptions match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubscriptions.map((subscription) => (
                <SubscriptionListRow
                  key={subscription.id}
                  subscription={subscription}
                  isSelected={subscription.id === selectedSubscriptionId}
                  onSelect={() => setSelectedSubscriptionId(subscription.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <DarkCard
          title={selectedSubscription ? selectedSubscription.planName : "Subscription details"}
          description={
            selectedSubscription
              ? `${selectedSubscription.customerName} • ${selectedSubscription.market}`
              : undefined
          }
        >
          {selectedSubscription ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <DarkMetaPill tone="brand">{selectedSubscription.billingMode}</DarkMetaPill>
                <SubscriptionStatusBadge status={selectedSubscription.status} dark />
              </DetailMetaRow>

              <p className="text-sm leading-6 text-white/70">{selectedSubscription.note}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileMiniStat label="Amount" value={`$${selectedSubscription.amount}`} />
                <ProfileMiniStat label="Interval" value={selectedSubscription.interval} />
                <ProfileMiniStat label="Next bill" value={selectedSubscription.nextBill} />
                <ProfileMiniStat label="Last charge" value={selectedSubscription.lastCharge} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Billing rules
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                      Retry rule
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-white">
                      {selectedSubscription.retryRule}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                      Customer
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-white">
                      {selectedSubscription.customerEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={toggleSubscriptionState}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white transition-all duration-200 hover:bg-white/10"
                >
                  {selectedSubscription.status === "Paused" ? "Resume subscription" : "Pause subscription"}
                </button>
                <ProfileActionLink href="/dashboard/payments" label="View payments" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Select a subscription to review billing rules and lifecycle state.
            </div>
          )}
        </DarkCard>
      </div>

      {isCreateSubscriptionOpen ? (
        <CreateSubscriptionModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsCreateSubscriptionOpen(false)}
          onSubmit={handleCreateSubscription}
        />
      ) : null}
    </>
  );
}

function SubscriptionListRow({
  subscription,
  isSelected,
  onSelect,
}: {
  subscription: SubscriptionRecord;
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.2fr)_auto_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            {subscription.planName}
          </p>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
            {subscription.customerName} • {subscription.customerEmail}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-self-start">
          <CustomerMetaPill>{subscription.market}</CustomerMetaPill>
          <CustomerMetaPill>{subscription.nextBill}</CustomerMetaPill>
          <CustomerMetaPill>
            {subscription.billingMode === "Metered"
              ? "Usage based"
              : `$${subscription.amount} • ${subscription.interval}`}
          </CustomerMetaPill>
        </div>

        <div className="flex justify-start lg:justify-self-end">
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
      </div>
    </button>
  );
}

function SubscriptionStatusBadge({
  status,
  dark = false,
}: {
  status: SubscriptionLifecycle;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Active"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "At risk"
            ? dark
              ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
              : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]"
            : dark
              ? "border border-white/12 bg-white/6 text-white/72"
              : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]",
      )}
    >
      {status}
    </span>
  );
}

function CreateSubscriptionModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewSubscriptionDraft;
  onChange: <K extends keyof NewSubscriptionDraft>(key: K, value: NewSubscriptionDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Create subscription
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Attach a customer to a billing plan and set the first billing cycle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close create subscription modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField label="Customer name">
              <input
                value={draft.customerName}
                onChange={(event) => onChange("customerName", event.target.value)}
                placeholder="Mazi Clinic"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>

            <PlanField label="Billing email">
              <input
                type="email"
                value={draft.customerEmail}
                onChange={(event) => onChange("customerEmail", event.target.value)}
                placeholder="ops@maziclinic.com"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField label="Plan">
              <select
                value={draft.planName}
                onChange={(event) => onChange("planName", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {["Core Plan", "Usage Flex", "Scale Annual"].map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </PlanField>

            <PlanField label="Market">
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
            </PlanField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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
              Save subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type PaymentStatus = "Settled" | "Pending" | "Failed";
type PaymentFilter = "All" | PaymentStatus;

type PaymentRecord = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  market: string;
  localAmount: string;
  usdcAmount: string;
  netAmount: string;
  status: PaymentStatus;
  settlementState: string;
  dueWindow: string;
  methodState: string;
  note: string;
  txHash: string;
};

type NewPaymentDraft = {
  customerName: string;
  customerEmail: string;
  market: string;
  localAmount: string;
  usdcAmount: string;
};

const initialPaymentRecords: PaymentRecord[] = [
  {
    id: "inv-1042",
    reference: "INV-1042",
    customerName: "Axel Telecom",
    customerEmail: "finance@axeltelecom.com",
    market: "NGN",
    localAmount: "₦78,500",
    usdcAmount: "50.00",
    netAmount: "49.42",
    status: "Settled",
    settlementState: "Confirmed onchain",
    dueWindow: "Today, 09:12 UTC",
    methodState: "Collected",
    note: "Customer paid successfully and treasury has already picked up the settlement leg.",
    txHash: "0x8a12...61f4",
  },
  {
    id: "inv-1041",
    reference: "INV-1041",
    customerName: "Mazi Clinic",
    customerEmail: "ops@maziclinic.com",
    market: "GHS",
    localAmount: "GH₵1,180",
    usdcAmount: "74.60",
    netAmount: "73.94",
    status: "Pending",
    settlementState: "Confirming",
    dueWindow: "Today, 11:30 UTC",
    methodState: "Awaiting confirmation",
    note: "Customer approved payment and settlement is waiting for final confirmation before treasury sweep.",
    txHash: "0x5c88...a104",
  },
  {
    id: "inv-1040",
    reference: "INV-1040",
    customerName: "Geno Labs",
    customerEmail: "billing@genolabs.io",
    market: "KES",
    localAmount: "KSh9,100",
    usdcAmount: "71.20",
    netAmount: "70.50",
    status: "Failed",
    settlementState: "Needs retry",
    dueWindow: "Tomorrow, 08:00 UTC",
    methodState: "Update needed",
    note: "The payment method needs attention before the next retry window can clear the charge.",
    txHash: "No hash yet",
  },
  {
    id: "inv-1039",
    reference: "INV-1039",
    customerName: "Sabi Retail",
    customerEmail: "accounts@sabiretail.africa",
    market: "ZMW",
    localAmount: "ZK5,400",
    usdcAmount: "198.30",
    netAmount: "196.81",
    status: "Settled",
    settlementState: "Settled",
    dueWindow: "Yesterday, 17:18 UTC",
    methodState: "Collected",
    note: "Latest invoice settled cleanly and the receipt is ready for finance review.",
    txHash: "0xf120...90de",
  },
];

function PaymentsSurface() {
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPaymentRecords);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState(initialPaymentRecords[0].id);
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [draft, setDraft] = useState<NewPaymentDraft>({
    customerName: "",
    customerEmail: "",
    market: "NGN",
    localAmount: "",
    usdcAmount: "",
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesFilter = activeFilter === "All" ? true : payment.status === activeFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [
            payment.reference,
            payment.customerName,
            payment.customerEmail,
            payment.market,
            payment.localAmount,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredPayments.length === 0) {
      return;
    }

    const currentStillVisible = filteredPayments.some((payment) => payment.id === selectedPaymentId);

    if (!currentStillVisible) {
      setSelectedPaymentId(filteredPayments[0].id);
    }
  }, [activeFilter, filteredPayments, query, selectedPaymentId]);

  const selectedPayment =
    filteredPayments.find((payment) => payment.id === selectedPaymentId) ?? filteredPayments[0] ?? null;

  const settledCount = payments.filter((payment) => payment.status === "Settled").length;
  const pendingCount = payments.filter((payment) => payment.status === "Pending").length;
  const failedCount = payments.filter((payment) => payment.status === "Failed").length;
  const grossUsdc = payments.reduce((total, payment) => total + Number(payment.usdcAmount), 0);

  function updateSelectedPayment(updater: (payment: PaymentRecord) => PaymentRecord) {
    if (!selectedPayment) {
      return;
    }

    setPayments((current) =>
      current.map((payment) => (payment.id === selectedPayment.id ? updater(payment) : payment)),
    );
  }

  function advancePaymentState() {
    if (!selectedPayment) {
      return;
    }

    if (selectedPayment.status === "Failed") {
      updateSelectedPayment((payment) => ({
        ...payment,
        status: "Pending",
        settlementState: "Retry queued",
        methodState: "Retry scheduled",
        note: "The next retry has been queued and this charge is waiting for customer confirmation again.",
      }));
      return;
    }

    if (selectedPayment.status === "Pending") {
      updateSelectedPayment((payment) => ({
        ...payment,
        status: "Settled",
        settlementState: "Confirmed onchain",
        methodState: "Collected",
        note: "Settlement has cleared and treasury can include this charge in the next sweep.",
      }));
      return;
    }

    updateSelectedPayment((payment) => ({
      ...payment,
      note: "Receipt export requested for finance review.",
    }));
  }

  function handleDraftChange<K extends keyof NewPaymentDraft>(key: K, value: NewPaymentDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreatePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const customerName = draft.customerName.trim();
    const customerEmail = draft.customerEmail.trim();
    const localAmount = draft.localAmount.trim();
    const usdcAmount = draft.usdcAmount.trim();

    if (!customerName || !customerEmail || !localAmount || !usdcAmount) {
      return;
    }

    const nextReference = `INV-${1043 + payments.length}`;
    const nextPayment: PaymentRecord = {
      id: `${nextReference.toLowerCase()}-${Date.now()}`,
      reference: nextReference,
      customerName,
      customerEmail,
      market: draft.market,
      localAmount,
      usdcAmount,
      netAmount: usdcAmount,
      status: "Pending",
      settlementState: "Awaiting customer action",
      dueWindow: "Today, 14:00 UTC",
      methodState: "Payment link sent",
      note: "Payment link issued and waiting for the customer to complete checkout.",
      txHash: "Pending",
    };

    setPayments((current) => [nextPayment, ...current]);
    setSelectedPaymentId(nextPayment.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      customerName: "",
      customerEmail: "",
      market: "NGN",
      localAmount: "",
      usdcAmount: "",
    });
    setIsCreatePaymentOpen(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard
          label="Settled today"
          value={String(settledCount)}
          note="Confirmed and cleared"
          tone="brand"
        />
        <PlanMetricCard label="Pending" value={String(pendingCount)} note="Waiting to confirm" />
        <PlanMetricCard label="Failed" value={String(failedCount)} note="Need intervention" />
        <PlanMetricCard
          label="Gross USDC"
          value={grossUsdc.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          note="Current view volume"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <Card title="Payments">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-[color:var(--muted)]"
                fill="none"
              >
                <circle cx="9" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12.8 12.8L16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by reference or customer"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsCreatePaymentOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Create payment link
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {(["All", "Settled", "Pending", "Failed"] as const).map((tab) => (
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

          {filteredPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No payments match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((payment) => (
                <PaymentListRow
                  key={payment.id}
                  payment={payment}
                  isSelected={payment.id === selectedPaymentId}
                  onSelect={() => setSelectedPaymentId(payment.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <DarkCard
          title={selectedPayment ? selectedPayment.reference : "Payment details"}
          description={
            selectedPayment ? `${selectedPayment.customerName} • ${selectedPayment.market}` : undefined
          }
        >
          {selectedPayment ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <PaymentStatusBadge status={selectedPayment.status} dark />
                <DarkMetaPill>{selectedPayment.settlementState}</DarkMetaPill>
              </DetailMetaRow>

              <p className="text-sm leading-6 text-white/70">{selectedPayment.note}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileMiniStat label="Local amount" value={selectedPayment.localAmount} />
                <ProfileMiniStat label="USDC" value={selectedPayment.usdcAmount} />
                <ProfileMiniStat label="Net" value={selectedPayment.netAmount} />
                <ProfileMiniStat label="Due window" value={selectedPayment.dueWindow} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Payment context
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                    <span className="text-sm text-white/68">Payment method</span>
                    <span className="text-sm font-semibold text-white">{selectedPayment.methodState}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                    <span className="text-sm text-white/68">Transaction</span>
                    <span className="text-sm font-semibold text-white">{selectedPayment.txHash}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={advancePaymentState}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white transition-all duration-200 hover:bg-white/10"
                >
                  {selectedPayment.status === "Failed"
                    ? "Queue retry"
                    : selectedPayment.status === "Pending"
                      ? "Mark settled"
                      : "Export receipt"}
                </button>
                <ProfileActionLink href="/dashboard/customers" label="View customer" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Select a payment to review settlement and follow-up actions.
            </div>
          )}
        </DarkCard>
      </div>

      {isCreatePaymentOpen ? (
        <CreatePaymentModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsCreatePaymentOpen(false)}
          onSubmit={handleCreatePayment}
        />
      ) : null}
    </>
  );
}

function PaymentListRow({
  payment,
  isSelected,
  onSelect,
}: {
  payment: PaymentRecord;
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.1fr)_auto_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            {payment.reference}
          </p>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
            {payment.customerName} • {payment.customerEmail}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-self-start">
          <CustomerMetaPill>{payment.market}</CustomerMetaPill>
          <CustomerMetaPill>{payment.localAmount}</CustomerMetaPill>
          <CustomerMetaPill>{payment.usdcAmount} USDC</CustomerMetaPill>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
          <span className="text-sm font-semibold text-[color:var(--muted)]">{payment.netAmount} net</span>
          <PaymentStatusBadge status={payment.status} />
        </div>
      </div>
    </button>
  );
}

function PaymentStatusBadge({
  status,
  dark = false,
}: {
  status: PaymentStatus;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Settled"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Pending"
            ? dark
              ? "border border-white/12 bg-white/6 text-white/72"
              : "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : dark
              ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
              : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]",
      )}
    >
      {status}
    </span>
  );
}

function CreatePaymentModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewPaymentDraft;
  onChange: <K extends keyof NewPaymentDraft>(key: K, value: NewPaymentDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Create payment link
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Issue a new payment request and track it from billing to settlement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close create payment modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField label="Customer name">
              <input
                value={draft.customerName}
                onChange={(event) => onChange("customerName", event.target.value)}
                placeholder="Axel Telecom"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>

            <PlanField label="Billing email">
              <input
                type="email"
                value={draft.customerEmail}
                onChange={(event) => onChange("customerEmail", event.target.value)}
                placeholder="finance@axeltelecom.com"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <PlanField label="Market">
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
            </PlanField>

            <PlanField label="Local amount">
              <input
                value={draft.localAmount}
                onChange={(event) => onChange("localAmount", event.target.value)}
                placeholder="₦78,500"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </PlanField>

            <PlanField label="USDC amount">
              <input
                value={draft.usdcAmount}
                onChange={(event) => onChange("usdcAmount", event.target.value)}
                placeholder="50.00"
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
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
              Save payment link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function parseAmountValue(value: string) {
  const normalizedValue = value.replace(/,/g, "");
  const parsedValue = Number.parseFloat(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

type TreasuryBatchStatus = "Queued" | "Confirming" | "Settled";
type TreasuryBatchFilter = "All" | TreasuryBatchStatus;

type TreasuryBatchRecord = {
  id: string;
  batch: string;
  gross: string;
  fees: string;
  net: string;
  status: TreasuryBatchStatus;
  destination: string;
  createdAt: string;
  eta: string;
  txHash: string;
  note: string;
};

type NewSweepDraft = {
  gross: string;
  destination: string;
};

const initialTreasuryBatches: TreasuryBatchRecord[] = [
  {
    id: "batch-248",
    batch: "248",
    gross: "21,440",
    fees: "2,020",
    net: "19,420",
    status: "Confirming",
    destination: "Primary settlement",
    createdAt: "Today, 10:18 UTC",
    eta: "6 mins",
    txHash: "0x8a12...61f4",
    note: "Current sweep is in confirmation and should land in the primary treasury wallet shortly.",
  },
  {
    id: "batch-247",
    batch: "247",
    gross: "14,180",
    fees: "1,280",
    net: "12,900",
    status: "Settled",
    destination: "Primary settlement",
    createdAt: "Today, 08:42 UTC",
    eta: "Cleared",
    txHash: "0x5c88...a104",
    note: "This batch has cleared and is ready for reconciliation export.",
  },
  {
    id: "batch-246",
    batch: "246",
    gross: "8,020",
    fees: "570",
    net: "7,450",
    status: "Settled",
    destination: "Reserve wallet",
    createdAt: "Yesterday, 17:04 UTC",
    eta: "Cleared",
    txHash: "0xf120...90de",
    note: "Reserve allocation completed successfully and is available for treasury review.",
  },
  {
    id: "batch-249",
    batch: "249",
    gross: "6,880",
    fees: "520",
    net: "6,360",
    status: "Queued",
    destination: "Ops float",
    createdAt: "Today, 12:10 UTC",
    eta: "Ready to sweep",
    txHash: "Pending",
    note: "This queue is waiting for the next treasury sweep to be initiated.",
  },
];

function TreasurySurface() {
  const [batches, setBatches] = useState<TreasuryBatchRecord[]>(initialTreasuryBatches);
  const [activeFilter, setActiveFilter] = useState<TreasuryBatchFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState(initialTreasuryBatches[0].id);
  const [isCreateSweepOpen, setIsCreateSweepOpen] = useState(false);
  const [draft, setDraft] = useState<NewSweepDraft>({
    gross: "",
    destination: "Primary settlement",
  });

  const filteredBatches = batches.filter((batch) => {
    const matchesFilter = activeFilter === "All" ? true : batch.status === activeFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [batch.batch, batch.destination, batch.txHash].join(" ").toLowerCase().includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredBatches.length === 0) {
      return;
    }

    const currentStillVisible = filteredBatches.some((batch) => batch.id === selectedBatchId);

    if (!currentStillVisible) {
      setSelectedBatchId(filteredBatches[0].id);
    }
  }, [activeFilter, filteredBatches, query, selectedBatchId]);

  const selectedBatch =
    filteredBatches.find((batch) => batch.id === selectedBatchId) ?? filteredBatches[0] ?? null;

  const queuedCount = batches.filter((batch) => batch.status === "Queued").length;
  const confirmingCount = batches.filter((batch) => batch.status === "Confirming").length;
  const settledCount = batches.filter((batch) => batch.status === "Settled").length;
  const readyNet = batches
    .filter((batch) => batch.status !== "Settled")
    .reduce((total, batch) => total + parseAmountValue(batch.net), 0);

  function updateSelectedBatch(updater: (batch: TreasuryBatchRecord) => TreasuryBatchRecord) {
    if (!selectedBatch) {
      return;
    }

    setBatches((current) =>
      current.map((batch) => (batch.id === selectedBatch.id ? updater(batch) : batch)),
    );
  }

  function advanceBatchState() {
    if (!selectedBatch) {
      return;
    }

    if (selectedBatch.status === "Queued") {
      updateSelectedBatch((batch) => ({
        ...batch,
        status: "Confirming",
        eta: "8 mins",
        txHash: "0xnew8...72af",
        note: "Sweep started and the batch is now waiting for onchain confirmation.",
      }));
      return;
    }

    if (selectedBatch.status === "Confirming") {
      updateSelectedBatch((batch) => ({
        ...batch,
        status: "Settled",
        eta: "Cleared",
        note: "Settlement has cleared and this batch is ready for reconciliation export.",
      }));
      return;
    }

    updateSelectedBatch((batch) => ({
      ...batch,
      note: "Settlement export requested for the finance team.",
    }));
  }

  function handleDraftChange<K extends keyof NewSweepDraft>(key: K, value: NewSweepDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreateSweep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const gross = draft.gross.trim();

    if (!gross) {
      return;
    }

    const nextBatchNumber = 250 + batches.length;
    const nextBatch: TreasuryBatchRecord = {
      id: `batch-${nextBatchNumber}-${Date.now()}`,
      batch: String(nextBatchNumber),
      gross,
      fees: "0.00",
      net: gross,
      status: "Queued",
      destination: draft.destination,
      createdAt: "Now",
      eta: "Ready to sweep",
      txHash: "Pending",
      note: "A new treasury sweep has been queued and is waiting for confirmation to begin.",
    };

    setBatches((current) => [nextBatch, ...current]);
    setSelectedBatchId(nextBatch.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      gross: "",
      destination: "Primary settlement",
    });
    setIsCreateSweepOpen(false);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard label="Queued" value={String(queuedCount)} note="Ready to sweep" tone="brand" />
        <PlanMetricCard label="Confirming" value={String(confirmingCount)} note="Onchain now" />
        <PlanMetricCard label="Settled" value={String(settledCount)} note="Cleared today" />
        <PlanMetricCard
          label="Ready net"
          value={readyNet.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          note="Pending treasury value"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <Card title="Treasury batches">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-[color:var(--muted)]"
                fill="none"
              >
                <circle cx="9" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12.8 12.8L16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by batch or destination"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsCreateSweepOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Create sweep
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {(["All", "Queued", "Confirming", "Settled"] as const).map((tab) => (
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

          {filteredBatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
              No treasury batches match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => (
                <TreasuryBatchRow
                  key={batch.id}
                  batch={batch}
                  isSelected={batch.id === selectedBatchId}
                  onSelect={() => setSelectedBatchId(batch.id)}
                />
              ))}
            </div>
          )}
        </Card>

        <DarkCard
          title={selectedBatch ? `Batch ${selectedBatch.batch}` : "Batch details"}
          description={selectedBatch ? selectedBatch.destination : undefined}
        >
          {selectedBatch ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <TreasuryStatusBadge status={selectedBatch.status} dark />
                <DarkMetaPill>{selectedBatch.createdAt}</DarkMetaPill>
              </DetailMetaRow>

              <p className="text-sm leading-6 text-white/70">{selectedBatch.note}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileMiniStat label="Gross" value={`${selectedBatch.gross} USDC`} />
                <ProfileMiniStat label="Fees" value={`${selectedBatch.fees} USDC`} />
                <ProfileMiniStat label="Net" value={`${selectedBatch.net} USDC`} />
                <ProfileMiniStat label="ETA" value={selectedBatch.eta} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Settlement route
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                    <span className="text-sm text-white/68">Destination</span>
                    <span className="text-sm font-semibold text-white">{selectedBatch.destination}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
                    <span className="text-sm text-white/68">Transaction</span>
                    <span className="text-sm font-semibold text-white">{selectedBatch.txHash}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={advanceBatchState}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white transition-all duration-200 hover:bg-white/10"
                >
                  {selectedBatch.status === "Queued"
                    ? "Start confirmation"
                    : selectedBatch.status === "Confirming"
                      ? "Mark settled"
                      : "Export settlement"}
                </button>
                <ProfileActionLink href="/dashboard/payments" label="View payments" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Select a batch to review settlement routing and treasury state.
            </div>
          )}
        </DarkCard>
      </div>

      {isCreateSweepOpen ? (
        <CreateSweepModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsCreateSweepOpen(false)}
          onSubmit={handleCreateSweep}
        />
      ) : null}
    </>
  );
}

function TreasuryBatchRow({
  batch,
  isSelected,
  onSelect,
}: {
  batch: TreasuryBatchRecord;
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            Batch {batch.batch}
          </p>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">
            {batch.destination} • {batch.createdAt}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-self-start">
          <CustomerMetaPill>{batch.gross} gross</CustomerMetaPill>
          <CustomerMetaPill>{batch.net} net</CustomerMetaPill>
          <CustomerMetaPill>{batch.eta}</CustomerMetaPill>
        </div>

        <div className="flex justify-start lg:justify-self-end">
          <TreasuryStatusBadge status={batch.status} />
        </div>
      </div>
    </button>
  );
}

function TreasuryStatusBadge({
  status,
  dark = false,
}: {
  status: TreasuryBatchStatus;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Settled"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Confirming"
            ? dark
              ? "border border-white/12 bg-white/6 text-white/72"
              : "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : dark
              ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
              : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]",
      )}
    >
      {status}
    </span>
  );
}

function CreateSweepModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewSweepDraft;
  onChange: <K extends keyof NewSweepDraft>(key: K, value: NewSweepDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Create sweep
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Queue the next treasury sweep and assign its destination wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close create sweep modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <PlanField label="Gross amount">
            <input
              value={draft.gross}
              onChange={(event) => onChange("gross", event.target.value)}
              placeholder="6,360"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
            />
          </PlanField>

          <PlanField label="Destination wallet">
            <select
              value={draft.destination}
              onChange={(event) => onChange("destination", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
            >
              {["Primary settlement", "Reserve wallet", "Ops float"].map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </PlanField>

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
              Save sweep
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type TeamRole = "Owner" | "Admin" | "Operations" | "Finance" | "Developer" | "Support";
type TeamMemberStatus = "Active" | "Invited";
type TeamFilter = "All" | "Active" | "Invited" | "Owner" | "Admin" | "Operations" | "Finance" | "Developer" | "Support";
type TeamPermission =
  | "Customers"
  | "Plans"
  | "Subscriptions"
  | "Payments"
  | "Treasury"
  | "Developers"
  | "Team admin";

type TeamActivity = {
  label: string;
  meta: string;
};

type TeamMemberRecord = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  lastActive: string;
  access: string;
  markets: string[];
  note: string;
  permissions: TeamPermission[];
  activity: TeamActivity[];
};

type NewTeamDraft = {
  name: string;
  email: string;
  role: TeamRole;
};

const initialTeamMembers: TeamMemberRecord[] = [
  {
    id: "member-ada",
    name: "Ada Nwosu",
    email: "ada@renew.sh",
    role: "Owner",
    status: "Active",
    lastActive: "2 min ago",
    access: "Full workspace",
    markets: ["NGN", "GHS", "KES"],
    note: "Owns billing policy, payout approvals, and final permission review.",
    permissions: ["Customers", "Plans", "Subscriptions", "Payments", "Treasury", "Developers", "Team admin"],
    activity: [
      { label: "Approved treasury sweep", meta: "18,420 USDC · 12 min ago" },
      { label: "Updated team permissions", meta: "Kola Martins · 1 hour ago" },
      { label: "Changed retry policy", meta: "Core Plan · Yesterday" },
    ],
  },
  {
    id: "member-kola",
    name: "Kola Martins",
    email: "kola@renew.sh",
    role: "Operations",
    status: "Active",
    lastActive: "18 min ago",
    access: "Customers + subscriptions",
    markets: ["NGN", "ZMW"],
    note: "Handles renewals, intervention queues, and manual subscription exceptions.",
    permissions: ["Customers", "Plans", "Subscriptions"],
    activity: [
      { label: "Paused subscription", meta: "Sabi Retail · 18 min ago" },
      { label: "Created customer", meta: "KudaFit Health · 42 min ago" },
      { label: "Updated plan assignment", meta: "Growth Plan · Today" },
    ],
  },
  {
    id: "member-jules",
    name: "Jules Amani",
    email: "jules@renew.sh",
    role: "Finance",
    status: "Active",
    lastActive: "1 hour ago",
    access: "Payments + treasury",
    markets: ["GHS", "KES"],
    note: "Owns reconciliation, settlement review, payout exports, and exception handling.",
    permissions: ["Payments", "Treasury"],
    activity: [
      { label: "Exported settlement report", meta: "Batch 248 · 1 hour ago" },
      { label: "Marked payment settled", meta: "PAY-2041 · 3 hours ago" },
      { label: "Reviewed payout variance", meta: "KES corridor · Today" },
    ],
  },
  {
    id: "member-mina",
    name: "Mina Sule",
    email: "mina@renew.sh",
    role: "Developer",
    status: "Active",
    lastActive: "3 hours ago",
    access: "API + webhooks",
    markets: ["All"],
    note: "Maintains API keys, webhooks, internal tooling, and sandbox configuration.",
    permissions: ["Developers"],
    activity: [
      { label: "Rotated webhook secret", meta: "billing-prod · Today" },
      { label: "Added test key", meta: "Sandbox env · Yesterday" },
      { label: "Validated callback retries", meta: "payments webhook · Yesterday" },
    ],
  },
  {
    id: "member-nuru",
    name: "Nuru Okeke",
    email: "nuru@renew.sh",
    role: "Support",
    status: "Active",
    lastActive: "27 min ago",
    access: "Customer support",
    markets: ["NGN", "GHS"],
    note: "Handles billing inquiries, failed charge follow-up, and account-level escalations.",
    permissions: ["Customers", "Subscriptions"],
    activity: [
      { label: "Reviewed failed renewal", meta: "Mazi Clinic · 27 min ago" },
      { label: "Updated account notes", meta: "Axel Telecom · 1 hour ago" },
      { label: "Escalated payment method issue", meta: "Geno Labs · Today" },
    ],
  },
  {
    id: "member-farah",
    name: "Farah Mensah",
    email: "farah@renew.sh",
    role: "Admin",
    status: "Invited",
    lastActive: "Pending invite",
    access: "Workspace admin",
    markets: ["GHS"],
    note: "Invitation is queued. Access will activate after acceptance.",
    permissions: ["Customers", "Plans", "Subscriptions", "Payments", "Treasury", "Team admin"],
    activity: [
      { label: "Invite created", meta: "Awaiting acceptance · Today" },
      { label: "Role assigned", meta: "Admin access · Today" },
    ],
  },
];

function TeamsSurface() {
  const [members, setMembers] = useState<TeamMemberRecord[]>(initialTeamMembers);
  const [activeFilter, setActiveFilter] = useState<TeamFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(initialTeamMembers[0].id);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<"access" | "activity" | null>(null);
  const [draft, setDraft] = useState<NewTeamDraft>({
    name: "",
    email: "",
    role: "Operations",
  });

  const filteredMembers = members.filter((member) => {
    const matchesFilter =
      activeFilter === "All"
        ? true
        : activeFilter === "Active"
          ? member.status === "Active"
          : activeFilter === "Invited"
            ? member.status === "Invited"
            : member.role === activeFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [member.name, member.email, member.role, member.access]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredMembers.length === 0) {
      return;
    }

    const currentStillVisible = filteredMembers.some((member) => member.id === selectedMemberId);

    if (!currentStillVisible) {
      setSelectedMemberId(filteredMembers[0].id);
    }
  }, [filteredMembers, selectedMemberId]);

  useEffect(() => {
    setOpenPanel(null);
  }, [selectedMemberId]);

  const selectedMember =
    filteredMembers.find((member) => member.id === selectedMemberId) ?? filteredMembers[0] ?? null;

  const activeCount = members.filter((member) => member.status === "Active").length;
  const adminsCount = members.filter(
    (member) => member.role === "Owner" || member.role === "Admin",
  ).length;
  const roleCount = new Set(members.map((member) => member.role)).size;
  const inviteCount = members.filter((member) => member.status === "Invited").length;

  function handleDraftChange<K extends keyof NewTeamDraft>(key: K, value: NewTeamDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const email = draft.email.trim();

    if (!name || !email) {
      return;
    }

    const role = draft.role;
    const nextMember: TeamMemberRecord = {
      id: `member-${Date.now()}`,
      name,
      email,
      role,
      status: "Invited",
      lastActive: "Pending invite",
      access: getTeamAccessLabel(role),
      markets: getTeamDefaultMarkets(role),
      note: "Invitation is queued. Access will activate after acceptance.",
      permissions: getTeamPermissions(role),
      activity: [
        { label: "Invite created", meta: "Awaiting acceptance · Just now" },
        { label: "Role assigned", meta: `${role} access · Just now` },
      ],
    };

    setMembers((current) => [nextMember, ...current]);
    setSelectedMemberId(nextMember.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      name: "",
      email: "",
      role: "Operations",
    });
    setIsInviteOpen(false);
  }

  function updateSelectedRole(role: TeamRole) {
    if (!selectedMember) {
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === selectedMember.id
          ? {
              ...member,
              role,
              access: getTeamAccessLabel(role),
              permissions: getTeamPermissions(role),
              markets: member.status === "Invited" ? getTeamDefaultMarkets(role) : member.markets,
            }
          : member,
      ),
    );
  }

  function toggleSelectedPermission(permission: TeamPermission) {
    if (!selectedMember) {
      return;
    }

    setMembers((current) =>
      current.map((member) => {
        if (member.id !== selectedMember.id) {
          return member;
        }

        const nextPermissions = member.permissions.includes(permission)
          ? member.permissions.filter((item) => item !== permission)
          : [...member.permissions, permission];

        return {
          ...member,
          permissions: nextPermissions,
          access: getTeamAccessFromPermissions(nextPermissions),
        };
      }),
    );
  }

  function resetSelectedPermissions() {
    if (!selectedMember) {
      return;
    }

    const nextPermissions = getTeamPermissions(selectedMember.role);
    setMembers((current) =>
      current.map((member) =>
        member.id === selectedMember.id
          ? {
              ...member,
              permissions: nextPermissions,
              access: getTeamAccessFromPermissions(nextPermissions),
            }
          : member,
      ),
    );
  }

  function resendInvite(memberId: string) {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId && member.status === "Invited"
          ? {
              ...member,
              lastActive: "Invite re-sent just now",
              note: "Reminder sent. Access will activate after acceptance.",
              activity: [{ label: "Invite re-sent", meta: "Just now" }, ...member.activity],
            }
          : member,
      ),
    );
  }

  function revokeInvite(memberId: string) {
    setMembers((current) => current.filter((member) => member.id !== memberId));
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard label="Team members" value={String(members.length)} note="Workspace seats" tone="brand" />
        <PlanMetricCard label="Active access" value={String(activeCount)} note="Can operate now" />
        <PlanMetricCard label="Admins" value={String(adminsCount)} note="Owner + admin roles" />
        <PlanMetricCard label="Pending invites" value={String(inviteCount)} note="Awaiting acceptance" />
      </div>

      <div className="grid gap-4 xl:items-start xl:grid-cols-[1.16fr_0.84fr]">
        <Card title="Team">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-[color:var(--muted)]"
                fill="none"
              >
                <circle cx="9" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12.8 12.8L16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by member, role, or access"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Invite member
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-4">
            {(["All", "Active", "Invited", "Owner", "Admin", "Operations", "Finance", "Developer", "Support"] as const).map((tab) => (
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

          <div className="max-h-[44rem] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white px-5 py-8 text-center text-sm text-[color:var(--muted)]">
                No team members match this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    isSelected={member.id === selectedMemberId}
                    onSelect={() => setSelectedMemberId(member.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <SidePanel title={selectedMember ? selectedMember.name : "Team member"} description={selectedMember?.email}>
          {selectedMember ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <TeamRoleBadge role={selectedMember.role} dark />
                <TeamStatusBadge status={selectedMember.status} dark />
                <DarkMetaPill>
                  {selectedMember.markets.includes("All") ? "Global" : `${selectedMember.markets.length} markets`}
                </DarkMetaPill>
              </DetailMetaRow>

              <div className="grid gap-3 sm:grid-cols-2">
                <TeamMiniStat label="Access" value={selectedMember.access} dark />
                <TeamMiniStat label="Last active" value={selectedMember.lastActive} dark />
                <TeamMiniStat label="Permissions" value={String(selectedMember.permissions.length)} dark />
                <TeamMiniStat
                  label="Coverage"
                  value={
                    selectedMember.markets.includes("All")
                      ? "Global"
                      : `${selectedMember.markets.length} markets`
                  }
                  dark
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">Team info</p>
                <p className="mt-3 text-sm leading-6 text-white/70">{selectedMember.note}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6">
                <button
                  type="button"
                  onClick={() => setOpenPanel((current) => (current === "access" ? null : "access"))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-white">Role and access</p>
                    <p className="mt-1 text-xs text-white/60">
                      Review role defaults or override permission scope.
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    className={cn(
                      "h-4 w-4 shrink-0 text-white/46 transition-transform duration-200",
                      openPanel === "access" ? "rotate-180" : "",
                    )}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {openPanel === "access" ? (
                  <div className="border-t border-white/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">Role</p>
                      <button
                        type="button"
                        onClick={resetSelectedPermissions}
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d9f6bc]"
                      >
                        Reset to default
                      </button>
                    </div>
                    <select
                      value={selectedMember.role}
                      onChange={(event) => updateSelectedRole(event.target.value as TeamRole)}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white outline-none"
                    >
                      {(["Owner", "Admin", "Operations", "Finance", "Developer", "Support"] as const).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["Customers", "Plans", "Subscriptions", "Payments", "Treasury", "Developers", "Team admin"] as const).map((permission) => {
                        const active = selectedMember.permissions.includes(permission);
                        return (
                          <button
                            key={permission}
                            type="button"
                            onClick={() => toggleSelectedPermission(permission)}
                            className={cn(
                              "inline-flex items-center rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                              active
                                ? "bg-[#0c4a27] text-[#d9f6bc]"
                                : "border border-white/10 bg-white/8 text-white/70 hover:bg-white/12",
                            )}
                          >
                            {permission}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6">
                <button
                  type="button"
                  onClick={() => setOpenPanel((current) => (current === "activity" ? null : "activity"))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-white">Recent activity</p>
                    <p className="mt-1 text-xs text-white/60">
                      See recent access and billing actions from this member.
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    className={cn(
                      "h-4 w-4 shrink-0 text-white/46 transition-transform duration-200",
                      openPanel === "activity" ? "rotate-180" : "",
                    )}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {openPanel === "activity" ? (
                  <div className="space-y-3 border-t border-white/10 px-4 py-4">
                    {selectedMember.activity.map((entry) => (
                      <div
                        key={`${entry.label}-${entry.meta}`}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-3"
                      >
                        <p className="text-sm font-semibold tracking-[-0.02em] text-white">{entry.label}</p>
                        <p className="text-right text-xs text-white/60">{entry.meta}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedMember.status === "Invited" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => resendInvite(selectedMember.id)}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
                    >
                      Resend invite
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeInvite(selectedMember.id)}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white"
                    >
                      Cancel invite
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
                    >
                      Sync role access
                    </button>
                    <a
                      href="/dashboard/settings"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white"
                    >
                      View audit log
                    </a>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Select a team member to review access and permissions.
            </div>
          )}
        </SidePanel>
      </div>

      {isInviteOpen ? (
        <InviteMemberModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsInviteOpen(false)}
          onSubmit={handleInviteMember}
        />
      ) : null}
    </>
  );
}

function getTeamAccessLabel(role: TeamRole) {
  switch (role) {
    case "Owner":
      return "Full workspace";
    case "Admin":
      return "Workspace admin";
    case "Operations":
      return "Customers + subscriptions";
    case "Finance":
      return "Payments + treasury";
    case "Developer":
      return "API + webhooks";
    case "Support":
      return "Customer support";
  }
}

function getTeamPermissions(role: TeamRole): TeamPermission[] {
  switch (role) {
    case "Owner":
      return ["Customers", "Plans", "Subscriptions", "Payments", "Treasury", "Developers", "Team admin"];
    case "Admin":
      return ["Customers", "Plans", "Subscriptions", "Payments", "Treasury", "Team admin"];
    case "Operations":
      return ["Customers", "Plans", "Subscriptions"];
    case "Finance":
      return ["Payments", "Treasury"];
    case "Developer":
      return ["Developers"];
    case "Support":
      return ["Customers", "Subscriptions"];
  }
}

function getTeamAccessFromPermissions(permissions: TeamPermission[]) {
  const next = [...permissions];

  if (next.includes("Team admin")) {
    return "Workspace admin";
  }

  if (next.length === 0) {
    return "No access";
  }

  if (next.length === 1) {
    return next[0];
  }

  return `${next.length} scopes`;
}

function getTeamDefaultMarkets(role: TeamRole) {
  switch (role) {
    case "Owner":
    case "Developer":
      return ["All"];
    case "Admin":
      return ["NGN", "GHS"];
    case "Operations":
      return ["NGN", "ZMW"];
    case "Finance":
      return ["GHS", "KES"];
    case "Support":
      return ["NGN"];
  }
}

function TeamMemberRow({
  member,
  isSelected,
  onSelect,
}: {
  member: TeamMemberRecord;
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
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{member.name}</p>
            <TeamRoleBadge role={member.role} />
            <TeamStatusBadge status={member.status} />
          </div>
          <p className="mt-1 truncate text-sm text-[color:var(--muted)]">{member.email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CustomerMetaPill>{member.lastActive}</CustomerMetaPill>
            <CustomerMetaPill>{member.access}</CustomerMetaPill>
            <CustomerMetaPill>
              {member.markets.includes("All") ? "Global" : `${member.markets.length} markets`}
            </CustomerMetaPill>
          </div>
        </div>

        <div className="flex justify-start lg:justify-self-end">
          <span className="inline-flex items-center rounded-full border border-[color:var(--line)] bg-white/76 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            {member.status === "Invited" ? "Invite pending" : "Active access"}
          </span>
        </div>
      </div>
    </button>
  );
}

function TeamRoleBadge({
  role,
  dark = false,
}: {
  role: TeamRole;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        dark
          ? "border border-white/10 bg-white/8 text-white/72"
          : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]",
      )}
    >
      {role}
    </span>
  );
}

function TeamStatusBadge({
  status,
  dark = false,
}: {
  status: TeamMemberStatus;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Active"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : dark
            ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
            : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]",
      )}
    >
      {status}
    </span>
  );
}

function CustomerLifecycleBadge({
  lifecycle,
  dark = false,
}: {
  lifecycle: CustomerRecord["lifecycle"];
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        lifecycle === "At risk"
          ? dark
            ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
            : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]"
          : lifecycle === "Paused"
            ? dark
              ? "border border-white/10 bg-white/8 text-white/72"
              : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]"
            : dark
              ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
              : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]",
      )}
    >
      {lifecycle}
    </span>
  );
}

function TeamMiniStat({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-4",
        dark ? "border border-white/10 bg-white/6" : "border border-[color:var(--line)] bg-[#f8faf7]",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          dark ? "text-white/46" : "text-[color:var(--muted)]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-sm font-semibold tracking-[-0.02em]",
          dark ? "text-white" : "text-[color:var(--ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InviteMemberModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewTeamDraft;
  onChange: <K extends keyof NewTeamDraft>(key: K, value: NewTeamDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Invite member
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Add a new operator, finance lead, or developer to this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close invite member modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <PlanField label="Full name">
            <input
              value={draft.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Amaka Obi"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
            />
          </PlanField>

          <PlanField label="Work email">
            <input
              value={draft.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="amaka@renew.sh"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
            />
          </PlanField>

          <PlanField label="Role">
            <select
              value={draft.role}
              onChange={(event) => onChange("role", event.target.value as TeamRole)}
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
            >
              {(["Owner", "Admin", "Operations", "Finance", "Developer", "Support"] as const).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </PlanField>

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
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type DeveloperKeyStatus = "Live" | "Test" | "Revoked";
type WebhookEndpointStatus = "Healthy" | "Retrying" | "Paused";
type DeliveryResult = "Delivered" | "Retried" | "Pending" | "Failed";

type DeveloperKeyRecord = {
  id: string;
  name: string;
  keyPreview: string;
  status: DeveloperKeyStatus;
  scope: string;
  mode: "Live" | "Test";
  lastUsed: string;
  dailyEvents: number;
  webhookCount: number;
  createdBy: string;
  note: string;
};

type WebhookEndpointRecord = {
  id: string;
  name: string;
  url: string;
  status: WebhookEndpointStatus;
  events: string;
  lastDelivery: string;
  signingState: string;
};

type DeliveryEventRecord = {
  id: string;
  event: string;
  object: string;
  endpoint: string;
  result: DeliveryResult;
  createdAt: string;
};

type DeveloperKeyFilter = "All" | DeveloperKeyStatus;

type NewDeveloperKeyDraft = {
  name: string;
  scope: string;
  mode: "Live" | "Test";
};

const developerScopeOptions = [
  "Billing + subscriptions",
  "Payments + treasury",
  "Webhooks only",
  "Read-only analytics",
] as const;

const initialDeveloperKeys: DeveloperKeyRecord[] = [
  {
    id: "dev-key-1",
    name: "Production API",
    keyPreview: "rk_live_••••4E9A",
    status: "Live",
    scope: "Billing + subscriptions",
    mode: "Live",
    lastUsed: "4 min ago",
    dailyEvents: 4820,
    webhookCount: 3,
    createdBy: "Ada Nwosu",
    note: "Primary production credential for billing sessions and subscription orchestration.",
  },
  {
    id: "dev-key-2",
    name: "Ops reconciliation",
    keyPreview: "rk_live_••••28D1",
    status: "Live",
    scope: "Payments + treasury",
    mode: "Live",
    lastUsed: "18 min ago",
    dailyEvents: 2960,
    webhookCount: 2,
    createdBy: "Jules Amani",
    note: "Treasury sync key used for settlement pulls and daily exports.",
  },
  {
    id: "dev-key-3",
    name: "Sandbox QA",
    keyPreview: "rk_test_••••B31F",
    status: "Test",
    scope: "Billing + subscriptions",
    mode: "Test",
    lastUsed: "52 min ago",
    dailyEvents: 840,
    webhookCount: 1,
    createdBy: "Mina Sule",
    note: "Sandbox credential used for integration testing and webhook replay.",
  },
  {
    id: "dev-key-4",
    name: "Legacy partner",
    keyPreview: "rk_live_••••9C77",
    status: "Revoked",
    scope: "Read-only analytics",
    mode: "Live",
    lastUsed: "Revoked",
    dailyEvents: 0,
    webhookCount: 0,
    createdBy: "Kola Martins",
    note: "Retired partner credential retained in the audit trail.",
  },
];

const initialWebhookEndpoints: WebhookEndpointRecord[] = [
  {
    id: "endpoint-1",
    name: "billing-prod",
    url: "https://ops.renew.sh/webhooks/billing-prod",
    status: "Healthy",
    events: "8.4k / day",
    lastDelivery: "2 min ago",
    signingState: "Signing enabled",
  },
  {
    id: "endpoint-2",
    name: "ops-sync",
    url: "https://ops.renew.sh/webhooks/ops-sync",
    status: "Healthy",
    events: "2.1k / day",
    lastDelivery: "5 min ago",
    signingState: "Signing enabled",
  },
  {
    id: "endpoint-3",
    name: "sandbox-hook",
    url: "https://sandbox.renew.sh/hooks/replay",
    status: "Retrying",
    events: "220 / day",
    lastDelivery: "Retrying now",
    signingState: "Rotate soon",
  },
];

const initialDeliveryEvents: DeliveryEventRecord[] = [
  {
    id: "delivery-1",
    event: "payment.settled",
    object: "INV-1042",
    endpoint: "billing-prod",
    result: "Delivered",
    createdAt: "1 min ago",
  },
  {
    id: "delivery-2",
    event: "subscription.retry_scheduled",
    object: "SUB-280",
    endpoint: "ops-sync",
    result: "Delivered",
    createdAt: "4 min ago",
  },
  {
    id: "delivery-3",
    event: "payment.failed",
    object: "INV-1040",
    endpoint: "billing-prod",
    result: "Retried",
    createdAt: "12 min ago",
  },
  {
    id: "delivery-4",
    event: "subscription.updated",
    object: "SUB-244",
    endpoint: "sandbox-hook",
    result: "Pending",
    createdAt: "18 min ago",
  },
  {
    id: "delivery-5",
    event: "plan.updated",
    object: "PLAN-031",
    endpoint: "sandbox-hook",
    result: "Failed",
    createdAt: "26 min ago",
  },
];

function DevelopersSurface() {
  const [keys, setKeys] = useState<DeveloperKeyRecord[]>(initialDeveloperKeys);
  const [endpoints, setEndpoints] = useState<WebhookEndpointRecord[]>(initialWebhookEndpoints);
  const [deliveries] = useState<DeliveryEventRecord[]>(initialDeliveryEvents);
  const [activeFilter, setActiveFilter] = useState<DeveloperKeyFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState(initialDeveloperKeys[0].id);
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [draft, setDraft] = useState<NewDeveloperKeyDraft>({
    name: "",
    scope: "Billing + subscriptions",
    mode: "Live",
  });

  const filteredKeys = keys.filter((key) => {
    const matchesFilter = activeFilter === "All" ? true : key.status === activeFilter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [key.name, key.keyPreview, key.scope, key.createdBy]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });

  useEffect(() => {
    if (filteredKeys.length === 0) {
      return;
    }

    const currentStillVisible = filteredKeys.some((key) => key.id === selectedKeyId);

    if (!currentStillVisible) {
      setSelectedKeyId(filteredKeys[0].id);
    }
  }, [activeFilter, filteredKeys, query, selectedKeyId]);

  const selectedKey = filteredKeys.find((key) => key.id === selectedKeyId) ?? filteredKeys[0] ?? null;

  const liveKeyCount = keys.filter((key) => key.status === "Live").length;
  const activeEndpointCount = endpoints.filter((endpoint) => endpoint.status !== "Paused").length;
  const successfulDeliveries = deliveries.filter(
    (event) => event.result === "Delivered" || event.result === "Retried",
  ).length;
  const deliveryRate = deliveries.length
    ? ((successfulDeliveries / deliveries.length) * 100).toFixed(1)
    : "0.0";
  const dailyEventVolume = keys.reduce((total, key) => total + key.dailyEvents, 0);

  function updateSelectedKey(updater: (key: DeveloperKeyRecord) => DeveloperKeyRecord) {
    if (!selectedKey) {
      return;
    }

    setKeys((current) => current.map((key) => (key.id === selectedKey.id ? updater(key) : key)));
  }

  function handleDraftChange<K extends keyof NewDeveloperKeyDraft>(key: K, value: NewDeveloperKeyDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreateKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();

    if (!name) {
      return;
    }

    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    const nextKey: DeveloperKeyRecord = {
      id: `dev-key-${Date.now()}`,
      name,
      keyPreview: `rk_${draft.mode.toLowerCase()}_••••${suffix}`,
      status: draft.mode === "Live" ? "Live" : "Test",
      scope: draft.scope,
      mode: draft.mode,
      lastUsed: "Never used",
      dailyEvents: 0,
      webhookCount: 0,
      createdBy: "You",
      note: "New credential is ready for integration and endpoint assignment.",
    };

    setKeys((current) => [nextKey, ...current]);
    setSelectedKeyId(nextKey.id);
    setActiveFilter("All");
    setQuery("");
    setDraft({
      name: "",
      scope: "Billing + subscriptions",
      mode: "Live",
    });
    setIsCreateKeyOpen(false);
  }

  function rotateSelectedKey() {
    if (!selectedKey) {
      return;
    }

    const suffix = Date.now().toString(36).slice(-4).toUpperCase();
    updateSelectedKey((key) => ({
      ...key,
      keyPreview: `rk_${key.mode.toLowerCase()}_••••${suffix}`,
      lastUsed: "Just rotated",
    }));
  }

  function toggleSelectedKeyStatus() {
    if (!selectedKey) {
      return;
    }

    updateSelectedKey((key) => ({
      ...key,
      status: key.status === "Revoked" ? (key.mode === "Live" ? "Live" : "Test") : "Revoked",
      lastUsed: key.status === "Revoked" ? "Restored now" : "Revoked",
    }));
  }

  function syncSelectedKeyField<K extends "mode" | "scope">(
    key: K,
    value: DeveloperKeyRecord[K],
  ) {
    updateSelectedKey((current) => {
      if (key === "mode") {
        return {
          ...current,
          mode: value as DeveloperKeyRecord["mode"],
          status:
            current.status === "Revoked"
              ? "Revoked"
              : (value as DeveloperKeyRecord["mode"]) === "Live"
                ? "Live"
                : "Test",
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function addWebhookEndpoint() {
    const nextEndpoint: WebhookEndpointRecord = {
      id: `endpoint-${Date.now()}`,
      name: `custom-hook-${endpoints.length + 1}`,
      url: "https://api.partner.com/renew/webhooks",
      status: "Paused",
      events: "0 / day",
      lastDelivery: "Never",
      signingState: "Set signing key",
    };

    setEndpoints((current) => [nextEndpoint, ...current]);
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PlanMetricCard label="Live keys" value={String(liveKeyCount)} note="Production credentials" tone="brand" />
        <PlanMetricCard label="Webhooks" value={String(activeEndpointCount)} note="Active endpoints" />
        <PlanMetricCard label="Delivery" value={`${deliveryRate}%`} note="Successful today" />
        <PlanMetricCard
          label="Daily events"
          value={dailyEventVolume.toLocaleString()}
          note="Across active credentials"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr] xl:items-start">
        <Card title="API keys">
          <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-[color:var(--muted)]"
                fill="none"
              >
                <circle cx="9" cy="9" r="4.8" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12.8 12.8L16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search keys, scopes, or owner"
                className="w-full bg-transparent text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsCreateKeyOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-[#0c4a27] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[#d9f6bc]"
            >
              Create key
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {(["All", "Live", "Test", "Revoked"] as const).map((tab) => (
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

          <div className="max-h-[44rem] space-y-3 overflow-y-auto pr-1">
            {filteredKeys.length > 0 ? (
              filteredKeys.map((key) => (
                <DeveloperKeyRow
                  key={key.id}
                  item={key}
                  isSelected={key.id === selectedKey?.id}
                  onSelect={() => setSelectedKeyId(key.id)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[#f8faf7] px-5 py-10 text-center text-sm text-[color:var(--muted)]">
                No API keys match this filter.
              </div>
            )}
          </div>
        </Card>

        <SidePanel title={selectedKey ? selectedKey.name : "Key details"} description={selectedKey?.keyPreview}>
          {selectedKey ? (
            <div className="space-y-5">
              <DetailMetaRow>
                <DeveloperKeyStatusBadge status={selectedKey.status} dark />
                <DarkMetaPill>{selectedKey.mode} mode</DarkMetaPill>
                <DarkMetaPill>{selectedKey.scope}</DarkMetaPill>
              </DetailMetaRow>

              <div className="grid gap-3 sm:grid-cols-3">
                <ProfileMiniStat label="Last used" value={selectedKey.lastUsed} />
                <ProfileMiniStat
                  label="Daily events"
                  value={selectedKey.dailyEvents.toLocaleString()}
                />
                <ProfileMiniStat
                  label="Endpoints"
                  value={String(selectedKey.webhookCount)}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                <div className="space-y-4">
                  <PlanField label="Key mode" dark>
                    <select
                      value={selectedKey.mode}
                      onChange={(event) =>
                        syncSelectedKeyField("mode", event.target.value as DeveloperKeyRecord["mode"])
                      }
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="Live">Live</option>
                      <option value="Test">Test</option>
                    </select>
                  </PlanField>

                  <PlanField label="Scope" dark>
                    <select
                      value={selectedKey.scope}
                      onChange={(event) => syncSelectedKeyField("scope", event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
                    >
                      {developerScopeOptions.map((scope) => (
                        <option key={scope} value={scope}>
                          {scope}
                        </option>
                      ))}
                    </select>
                  </PlanField>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">Key note</p>
                <p className="mt-3 text-sm leading-7 text-white/72">{selectedKey.note}</p>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <span className="text-sm text-white/68">Created by</span>
                  <span className="text-sm font-semibold text-white">{selectedKey.createdBy}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PlanActionButton label="Rotate key" onClick={rotateSelectedKey} dark />
                <PlanActionButton
                  label={selectedKey.status === "Revoked" ? "Restore key" : "Revoke key"}
                  onClick={toggleSelectedKeyStatus}
                  dark
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
              Select a key to review access, usage, and endpoint coverage.
            </div>
          )}
        </SidePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card title="Webhook endpoints">
          <div className="flex items-center justify-between gap-3 pb-4">
            <p className="text-sm text-[color:var(--muted)]">Delivery destinations and signing status.</p>
            <button
              type="button"
              onClick={addWebhookEndpoint}
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)] transition-all duration-200 hover:bg-[#f7fbf5]"
            >
              Add endpoint
            </button>
          </div>

          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                        {endpoint.name}
                      </p>
                      <WebhookStatusBadge status={endpoint.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-[color:var(--muted)]">{endpoint.url}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <CustomerMetaPill>{endpoint.events}</CustomerMetaPill>
                    <CustomerMetaPill>{endpoint.lastDelivery}</CustomerMetaPill>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] px-4 py-3">
                  <span className="text-sm text-[color:var(--muted)]">Signature</span>
                  <span className="text-sm font-semibold text-[color:var(--ink)]">{endpoint.signingState}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent deliveries">
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <EventDeliveryRow key={delivery.id} delivery={delivery} />
            ))}
          </div>
        </Card>
      </div>

      {isCreateKeyOpen ? (
        <CreateDeveloperKeyModal
          draft={draft}
          onChange={handleDraftChange}
          onClose={() => setIsCreateKeyOpen(false)}
          onSubmit={handleCreateKey}
        />
      ) : null}
    </>
  );
}

function DeveloperKeyRow({
  item,
  isSelected,
  onSelect,
}: {
  item: DeveloperKeyRecord;
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
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{item.name}</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">{item.keyPreview}</p>
          </div>
          <DeveloperKeyStatusBadge status={item.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomerMetaPill>{item.scope}</CustomerMetaPill>
          <CustomerMetaPill>{item.webhookCount} endpoints</CustomerMetaPill>
          <CustomerMetaPill>{item.lastUsed}</CustomerMetaPill>
        </div>
      </div>
    </button>
  );
}

function DeveloperKeyStatusBadge({
  status,
  dark = false,
}: {
  status: DeveloperKeyStatus;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Live"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Test"
            ? dark
              ? "border border-white/10 bg-white/8 text-white/72"
              : "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : dark
              ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
              : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]",
      )}
    >
      {status}
    </span>
  );
}

function WebhookStatusBadge({ status }: { status: WebhookEndpointStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Healthy"
          ? "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Retrying"
            ? "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]"
            : "border border-[#e2e6e0] bg-[#f3f5f2] text-[color:var(--muted)]",
      )}
    >
      {status}
    </span>
  );
}

function EventDeliveryRow({ delivery }: { delivery: DeliveryEventRecord }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{delivery.event}</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {delivery.object} • {delivery.endpoint}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <CustomerMetaPill>{delivery.createdAt}</CustomerMetaPill>
          <DeliveryResultBadge result={delivery.result} />
        </div>
      </div>
    </div>
  );
}

function DeliveryResultBadge({ result }: { result: DeliveryResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        result === "Delivered"
          ? "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : result === "Retried"
            ? "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : result === "Pending"
              ? "border border-[#e2e6e0] bg-[#f3f5f2] text-[color:var(--muted)]"
              : "border border-[#f0d0aa] bg-[#fff2e1] text-[#8a4b0f]",
      )}
    >
      {result}
    </span>
  );
}

function CreateDeveloperKeyModal({
  draft,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: NewDeveloperKeyDraft;
  onChange: <K extends keyof NewDeveloperKeyDraft>(key: K, value: NewDeveloperKeyDraft[K]) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121312]/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_24px_90px_rgba(16,32,20,0.16)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Create API key
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Issue a new credential and assign the initial scope before it reaches production.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[#f8faf7] text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--ink)]"
            aria-label="Close create API key modal"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10" strokeLinecap="round" />
              <path d="M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <PlanField label="Key name">
            <input
              value={draft.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Partner production"
              className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)]"
            />
          </PlanField>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField label="Scope">
              <select
                value={draft.scope}
                onChange={(event) => onChange("scope", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                {developerScopeOptions.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </PlanField>

            <PlanField label="Mode">
              <select
                value={draft.mode}
                onChange={(event) => onChange("mode", event.target.value as NewDeveloperKeyDraft["mode"])}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none"
              >
                <option value="Live">Live</option>
                <option value="Test">Test</option>
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
              Save key
            </button>
          </div>
        </form>
      </div>
    </div>
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

function SidePanel({ title, description, children }: CardProps) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#121312] p-5 text-white shadow-[0_18px_70px_rgba(16,32,20,0.14)] sm:p-6">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.05em]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-7 text-white/70">{description}</p> : null}
      <div className={cn(description ? "mt-5" : "mt-4")}>{children}</div>
    </div>
  );
}

function DetailMetaRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function DarkMetaPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "brand"
          ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
          : "border border-white/10 bg-white/8 text-white/72",
      )}
    >
      {children}
    </span>
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
  dark = false,
}: {
  status: PlanStatus;
  compact?: boolean;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "Live"
          ? dark
            ? "border border-[#2f5a42] bg-[#d9f6bc]/10 text-[#d9f6bc]"
            : "border border-[#bfe8cb] bg-[#dff7e6] text-[#0f8a47]"
          : status === "Draft"
            ? dark
              ? "border border-white/10 bg-white/8 text-white/72"
              : "border border-[#d9e7d6] bg-[#edf7eb] text-[color:var(--brand)]"
            : dark
              ? "border border-[#684920] bg-[#f5c98f]/10 text-[#f5c98f]"
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
  dark = false,
}: {
  label: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          dark ? "text-white/46" : "text-[color:var(--muted)]",
        )}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function PlanActionButton({
  label,
  onClick,
  dark = false,
}: {
  label: string;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold tracking-[-0.02em] transition-all duration-200",
        dark
          ? "border border-white/10 bg-white/6 text-white hover:bg-white/10"
          : "border border-[color:var(--line)] bg-white text-[color:var(--ink)] hover:bg-[#f7fbf5]",
      )}
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
