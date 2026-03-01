import { flowSteps } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function SettlementFlow() {
  return (
    <section id="how-it-works" className="pb-28 pt-4">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="glow-panel p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">
              How it works
            </p>
            <h2 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.08em] text-[color:var(--ink)] sm:text-6xl">
              A cleaner payment path from invoice to confirmed settlement.
            </h2>

            <div className="mt-10 space-y-6">
              {flowSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand)] text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-[color:var(--muted)]">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <div id="network" className="grid gap-6">
            <Reveal className="glow-panel p-6 sm:p-8" delay={0.08}>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">
                Why Avalanche
              </p>
              <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.05em] text-[color:var(--ink)]">
                The network fit is speed, fees, and predictable execution.
              </h3>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
                Renew is designed around Avalanche C-Chain so merchants get EVM compatibility, stablecoin liquidity, and settlement times that still feel usable in a billing workflow.
              </p>
            </Reveal>

            <Reveal className="glow-panel p-6 sm:p-8" delay={0.16}>
              <div className="grid gap-4">
                <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/70 p-5">
                  <p className="text-sm font-medium text-[color:var(--muted)]">Client responsibility</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                    Wallet checks, signatures, and clear pending states
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/70 p-5">
                  <p className="text-sm font-medium text-[color:var(--muted)]">Server responsibility</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                    Reconciliation, invoice truth, and treasury-safe status
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

