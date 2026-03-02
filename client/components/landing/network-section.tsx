import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const networkPoints = [
  {
    title: "Fast finality",
    body: "Settlement confirms quickly enough to stay usable in a billing workflow.",
  },
  {
    title: "Lower fees",
    body: "Small-value renewals are easier to run when network costs stay predictable.",
  },
  {
    title: "EVM-native",
    body: "You keep familiar tooling, wallets, and contract integrations on the treasury side.",
  },
  {
    title: "USDC ready",
    body: "Stablecoin liquidity and routing are already strong where Renew settles.",
  },
];

export function NetworkSection() {
  return (
    <section id="network" className="pb-24 pt-4 sm:pb-28 sm:pt-6">
      <Container>
        <div className="rounded-[2.25rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,#171816_0%,#111111_100%)] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
            <Reveal className="max-w-xl" offset={24}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d9f6bc] sm:text-sm">
                Why Avalanche
              </p>
              <h2 className="mt-3 font-display text-4xl leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.15rem]">
                The network fit is speed, cost, and familiar execution.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-white/68 sm:text-lg">
                Renew settles on Avalanche so the billing rail stays fast enough for operators and practical enough for repeatable charges.
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {networkPoints.map((point, index) => (
                <Reveal
                  key={point.title}
                  delay={0.08 * (index + 1)}
                  offset={22}
                  className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-5"
                >
                  <p className="text-sm font-semibold tracking-[-0.02em] text-white">{point.title}</p>
                  <p className="mt-3 text-sm leading-6 text-white/64 sm:text-base">{point.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
