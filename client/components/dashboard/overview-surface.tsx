"use client";

import { Card, MetricCard, PageState, StatGrid } from "@/components/dashboard/ui";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  formatCurrency,
  formatDateTime,
  formatCompactNumber,
} from "@/components/dashboard/surface-utils";
import { loadDashboardOverview } from "@/lib/overview";

export function OverviewSurface() {
  const { data, isLoading, error, reload } = useAuthedResource(loadDashboardOverview);

  if (isLoading && !data) {
    return (
      <PageState
        title="Loading overview"
        message="Fetching real billing, settlement, and renewal metrics."
      />
    );
  }

  if (error || !data) {
    return (
      <PageState
        title="Overview unavailable"
        message={error ?? "Unable to load overview."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard
          label="Customers"
          value={formatCompactNumber(data.stats.totalCustomers)}
          note={`${data.stats.atRiskCustomers} need follow-up`}
          tone="brand"
        />
        <MetricCard
          label="Plans"
          value={String(data.stats.activePlans)}
          note={`${data.stats.meteredPlans} metered`}
        />
        <MetricCard
          label="Subscriptions"
          value={formatCompactNumber(data.stats.activeSubscriptions)}
          note="Active recurring coverage"
        />
        <MetricCard
          label="Ready net"
          value={formatCurrency(data.stats.readyNetUsdc)}
          note={`${data.stats.pendingSettlements} settlement batches open`}
        />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Market mix" description="Real customer volume concentration by billing market.">
          <div className="space-y-4">
            {data.marketMix.length === 0 ? (
              <p className="text-sm leading-7 text-[color:var(--muted)]">
                No market volume is available yet.
              </p>
            ) : (
              data.marketMix.map((item) => (
                <div key={item.market} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                    <span>{item.market}</span>
                    <span className="text-[color:var(--muted)]">{item.share}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#e6ebe4]">
                    <div
                      className="h-full rounded-full bg-[#0c4a27]"
                      style={{ width: `${Math.max(item.share, 4)}%` }}
                    />
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {formatCurrency(item.totalVolume)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Upcoming renewals" description="The next real subscription renewals due in the next 48 hours.">
          <div className="space-y-3">
            {data.upcomingRenewals.length === 0 ? (
              <p className="text-sm leading-7 text-[color:var(--muted)]">
                No renewals are scheduled in the current window.
              </p>
            ) : (
              data.upcomingRenewals.map((renewal) => (
                <div
                  key={renewal.subscriptionId}
                  className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                        {renewal.planName}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">
                        {renewal.customerName}
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                      {renewal.billingCurrency}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
                    <span>{formatCurrency(renewal.localAmount, renewal.billingCurrency)}</span>
                    <span>{formatDateTime(renewal.nextChargeAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Settlement snapshot" description="Current net pending vs settled volume from the live backend.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Pending settlements
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                {String(data.stats.pendingSettlements)}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Settled 30d
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                {formatCurrency(data.stats.settledUsdc30d)}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Risk snapshot" description="Customer and billing risk surfaced from current workspace records.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                At-risk customers
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                {String(data.stats.atRiskCustomers)}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Metered plans
              </p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                {String(data.stats.meteredPlans)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
