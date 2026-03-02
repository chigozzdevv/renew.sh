import { flowSteps } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function BillingFlow() {
  return (
    <section id="how-it-works" className="pb-24 pt-8 sm:pb-28 sm:pt-10">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-10">
          <div className="relative ml-5 border-l border-[color:var(--line)] pl-6 sm:ml-6 sm:pl-8 lg:ml-0">
            {flowSteps.map((step, index) => (
              <Reveal
                key={step.title}
                delay={0.08 * (index + 1)}
                offset={28}
                className={index === flowSteps.length - 1 ? "" : "pb-5 sm:pb-6"}
              >
                <div className="relative rounded-[2rem] border border-black/6 bg-white/90 p-6 sm:p-7">
                  <div className="absolute -left-[3.05rem] top-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#121312] text-sm font-semibold text-[#d9f6bc] sm:-left-[3.45rem]">
                    0{index + 1}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)] sm:text-sm">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-4 max-w-[14ch] text-[1.7rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[color:var(--ink)] sm:text-[2rem]">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-[44ch] text-base leading-7 text-[color:var(--muted)]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="lg:sticky lg:top-28 lg:self-start" offset={24}>
            <div className="max-w-lg lg:ml-auto">
              <h2 className="font-display text-4xl leading-[0.98] tracking-[-0.06em] text-[color:var(--ink)] sm:text-[3.25rem]">
                From local checkout to USDC settlement.
              </h2>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
