import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const networkPoints = [
  {
    title: "Fast confirmations",
    body: "Recurring charges stay usable when settlement clears quickly enough for real operations.",
  },
  {
    title: "Predictable fees",
    body: "Lower, steadier network costs make smaller renewals and metered charges easier to run.",
  },
  {
    title: "Familiar tooling",
    body: "EVM compatibility keeps wallets, contract integrations, and treasury automation straightforward.",
  },
  {
    title: "USDC liquidity",
    body: "Renew settles where stablecoin routing and treasury movement are already practical.",
  },
];

export function NetworkSection() {
  return (
    <section id="network" className="pb-24 pt-4 sm:pb-28 sm:pt-6">
      <Container>
        <div className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_30%),linear-gradient(180deg,#171816_0%,#111111_100%)] p-5 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-8">
            <Reveal className="max-w-xl" offset={24}>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d9f6bc] sm:text-sm">
                Why Avalanche
              </p>
              <h2 className="mt-3 max-w-[9ch] text-balance font-display text-4xl leading-[0.98] tracking-[-0.06em] text-white sm:text-[2.9rem]">
                Fast, practical settlement on Avalanche.
              </h2>
              <p className="mt-4 max-w-[28ch] text-base leading-7 text-white/68 sm:text-lg">
                Renew uses Avalanche for the treasury leg so recurring billing stays usable at scale.
              </p>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {networkPoints.map((point, index) => (
                <Reveal
                  key={point.title}
                  delay={0.08 * (index + 1)}
                  offset={22}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-4 sm:p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-xs font-semibold text-[#d9f6bc]">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-white sm:text-base">
                        {point.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/64">{point.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
