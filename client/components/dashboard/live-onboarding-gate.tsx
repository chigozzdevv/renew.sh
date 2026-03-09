"use client";

import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { Badge, Button, Card } from "@/components/dashboard/ui";

const rolloutChecks = [
  {
    label: "Security audit",
    detail: "Required before we open live KYB and operator KYC.",
  },
  {
    label: "Mainnet deployment",
    detail: "Required before live billing, treasury, and settlement access unlock.",
  },
  {
    label: "Live onboarding",
    detail: "Will open with workspace KYB and operator KYC after the launch gate clears.",
  },
];

const onboardingTracks = [
  {
    label: "KYB",
    title: "Business verification",
    description:
      "Verify the legal entity, registration details, payout ownership, and treasury profile before the workspace can process live billing.",
  },
  {
    label: "KYC",
    title: "Operator verification",
    description:
      "Verify the owners, admins, and treasury approvers who will operate live collections, treasury actions, and settlements.",
  },
];

const testModeChecklist = [
  "Create customers, plans, subscriptions, and payments in test mode.",
  "Validate treasury configuration, wallet flows, and webhook integrations safely.",
  "Keep the team in test until Renew opens live onboarding after audit and mainnet deployment.",
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
                Live onboarding with KYC/KYB opens after audit and mainnet deployment.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--muted)] sm:text-[15px]">
                {firstName ? `${firstName}, ` : ""}
                live workspace access stays locked until Renew clears the rollout
                gate for security audit, mainnet deployment, merchant KYB, and
                operator KYC. Use test mode for billing work for now.
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
            <div className="mt-4 space-y-3">
              {rolloutChecks.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-[color:var(--line)] bg-[#f8faf7] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#c58b33]" />
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="What unlocks live access"
          description="Live access will stay blocked until the workspace clears both compliance tracks."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {onboardingTracks.map((track) => (
              <div
                key={track.label}
                className="rounded-[1.75rem] border border-[color:var(--line)] bg-[#f8faf7] p-5"
              >
                <Badge tone={track.label === "KYB" ? "brand" : "neutral"}>
                  {track.label}
                </Badge>
                <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
                  {track.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                  {track.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Use test mode for now"
          description="Everything below remains available while live onboarding stays closed."
        >
          <div className="space-y-3">
            {testModeChecklist.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-[1.4rem] border border-[color:var(--line)] bg-white px-4 py-3"
              >
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0c4a27] text-[10px] font-semibold text-[#d9f6bc]">
                  OK
                </span>
                <p className="text-sm leading-7 text-[color:var(--muted)]">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
