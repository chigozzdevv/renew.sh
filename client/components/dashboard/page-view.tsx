import type { DashboardPageContent } from "@/types/dashboard";

import { cn } from "@/lib/utils";

type DashboardPageViewProps = {
  page: DashboardPageContent;
};

export function DashboardPageView({ page }: DashboardPageViewProps) {
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
              title="NGN core run"
              metric="184 queued"
              tone="brand"
            />
            <RenewalCheckpoint
              time="Tomorrow, 12:00 UTC"
              title="Meter approvals"
              metric="3 pending"
            />
            <RenewalCheckpoint
              time="Friday, 08:00 UTC"
              title="KES annual cycle"
              metric="Large run"
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
          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
            {title}
          </p>
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

function CustomersSurface() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
      <Card title="Customer directory" description="Billing health and region stay visible in one list.">
        <div className="flex flex-wrap gap-2 pb-4">
          {["All", "At risk", "Active", "Paused"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
                index === 0
                  ? "bg-[#0c4a27] text-[#d9f6bc]"
                  : "border border-[color:var(--line)] bg-white text-[color:var(--muted)]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <TableHeader columns={["Customer", "Market", "Subscriptions", "Status"]} />
        <TableRow columns={["Axel Telecom", "NGN", "4 active", "Healthy"]} tone="brand" />
        <TableRow columns={["Mazi Clinic", "GHS", "2 active", "At risk"]} tone="warning" />
        <TableRow columns={["Geno Labs", "KES", "1 paused", "Paused"]} />
        <TableRow columns={["Sabi Retail", "ZMW", "5 active", "Healthy"]} />
      </Card>

      <DarkCard title="Selected profile" description="Mazi Clinic">
        <div className="space-y-4">
          <StatusLine label="Last successful charge" value="Jun 04" />
          <StatusLine label="Next renewal" value="Jun 11" />
          <StatusLine label="Risk state" value="Needs card update" tone="warning" />
          <div className="rounded-2xl bg-white/6 p-4 text-sm leading-7 text-white/76">
            One payment method update is required before the next renewal cycle. Support can
            resend the billing link directly from this profile.
          </div>
        </div>
      </DarkCard>
    </div>
  );
}

function PlansSurface() {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-3">
        <PlanCard
          title="Growth"
          price="$49"
          interval="Monthly"
          meta="412 active subscribers"
          features={["7-day trial", "3 retries", "Local checkout enabled"]}
          highlighted
        />
        <PlanCard
          title="Scale"
          price="$199"
          interval="Monthly"
          meta="128 active subscribers"
          features={["Metered usage", "Priority retries", "Manual approval path"]}
        />
        <PlanCard
          title="Enterprise"
          price="Custom"
          interval="Annual"
          meta="18 active subscribers"
          features={["Custom pricing", "Quote controls", "Dedicated settlement rules"]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Plan editor" description="Growth plan defaults">
          <div className="grid gap-3 md:grid-cols-2">
            <FieldMock label="Base amount" value="$49.00" />
            <FieldMock label="Interval" value="Monthly" />
            <FieldMock label="Trial" value="7 days" />
            <FieldMock label="Retry rule" value="3 attempts / 5 days" />
          </div>
        </Card>
        <Card title="Rollout coverage" description="Where this plan is currently enabled.">
          <div className="grid gap-2 grid-cols-2">
            {["NGN", "KES", "GHS", "ZMW", "RWF", "ZAR"].map((market) => (
              <div key={market} className="rounded-2xl border border-[color:var(--line)] bg-[#edf7eb] px-4 py-3 text-sm font-semibold text-[color:var(--brand)]">
                {market}
              </div>
            ))}
          </div>
        </Card>
      </div>
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
      <div className="mt-2 h-2 rounded-full bg-black/6">
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

function PlanCard({
  title,
  price,
  interval,
  meta,
  features,
  highlighted = false,
}: {
  title: string;
  price: string;
  interval: string;
  meta: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border p-5 sm:p-6",
        highlighted
          ? "border-[#0c4a27]/10 bg-[#0c4a27] text-white"
          : "border-[color:var(--line)] bg-white/82 text-[color:var(--ink)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-[0.14em]",
              highlighted ? "text-[#d9f6bc]" : "text-[color:var(--brand)]",
            )}
          >
            {title}
          </p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.06em]">{price}</p>
          <p className={cn("mt-1 text-sm", highlighted ? "text-white/70" : "text-[color:var(--muted)]")}>
            {interval}
          </p>
        </div>
        <span
          className={cn(
            "rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]",
            highlighted
              ? "bg-white/10 text-[#d9f6bc]"
              : "border border-[color:var(--line)] bg-[#edf7eb] text-[color:var(--brand)]",
          )}
        >
          {meta}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-3">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                highlighted ? "bg-[#d9f6bc]" : "bg-[#0c4a27]",
              )}
            />
            <span className={cn("text-sm", highlighted ? "text-white/78" : "text-[color:var(--muted)]")}>
              {feature}
            </span>
          </div>
        ))}
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
