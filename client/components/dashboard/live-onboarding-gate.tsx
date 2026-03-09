"use client";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { Badge, Button } from "@/components/dashboard/ui";

const rolloutChecks = [
  {
    label: "Security audit",
    detail: "This must be completed before merchant KYB and operator KYC can open.",
  },
  {
    label: "Mainnet deployment",
    detail: "This must be completed before live billing, treasury, and settlement access can unlock.",
  },
  {
    label: "Live onboarding",
    detail: "Merchant KYB and operator KYC will open after the audit and mainnet launch are complete.",
  },
];

export function LiveOnboardingGate() {
  const { user } = useDashboardSession();
  const { isUpdating, setMode } = useWorkspaceMode();
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2.4rem] border border-[#d3e4cf] bg-[radial-gradient(circle_at_top_left,_rgba(217,246,188,0.78),_rgba(244,247,241,0.96)_52%,_rgba(255,255,255,0.98)_100%)] p-6 shadow-[0_24px_80px_rgba(12,74,39,0.08)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-4">
            <Badge tone="warning">Live onboarding locked</Badge>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-[color:var(--ink)] sm:text-[2.6rem]">
                Live access opens after audit and mainnet deployment.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-[15px]">
                {firstName ? `${firstName}, ` : ""}
                your workspace will stay in test mode until Renew clears the live
                rollout checklist.
              </p>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-[15px]">
                Live onboarding will open after the security audit and mainnet
                deployment are complete, followed by merchant KYB and operator
                KYC. Use test mode for billing work for now.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                tone="brand"
                disabled={isUpdating}
                onClick={() => void setMode("test")}
              >
                {isUpdating ? "Switching..." : "Switch to test mode"}
              </Button>
              <Button type="button" disabled className="min-w-[190px]">
                Start live onboarding
              </Button>
            </div>
          </div>

          <div className="min-w-[280px] max-w-[320px] rounded-[1.9rem] border border-white/70 bg-white/72 p-5 shadow-[0_16px_40px_rgba(16,32,20,0.05)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Rollout status
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Live access opens in three steps.
            </p>
            <div className="mt-5 space-y-0">
              {rolloutChecks.map((item, index) => (
                <div
                  key={item.label}
                  className="relative flex gap-4 pb-5 last:pb-0"
                >
                  <div className="relative flex w-9 shrink-0 flex-col items-center">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#0c4a27]/12 bg-[#edf7eb] text-sm font-semibold text-[color:var(--brand)]">
                      {index + 1}
                    </span>
                    {index < rolloutChecks.length - 1 ? (
                      <span className="mt-2 h-full w-px bg-gradient-to-b from-[#cfe3c4] to-transparent" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 rounded-[1.4rem] border border-[color:var(--line)] bg-[#f8faf7] px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
