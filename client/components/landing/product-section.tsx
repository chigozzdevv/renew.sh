import { featureCards } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function WhyRenewSection() {
  return (
    <section id="why-renew" className="pb-24 pt-2 sm:pb-28">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">
            Why Renew
          </p>
          <h2 className="mt-4 font-display text-4xl leading-[0.98] tracking-[-0.07em] text-[color:var(--ink)] sm:text-5xl">
            Built for repeatable billing.
          </h2>
          <p className="mt-4 text-base leading-7 text-[color:var(--muted)] sm:text-lg">
            Local collection, USDC settlement, and billing logic that scales.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {featureCards.map((card, index) => (
            <Reveal
              key={card.title}
              delay={0.08 * (index + 1)}
              className={
                index === 0 || index === featureCards.length - 1
                  ? "h-full rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1c1c1f,#121312)] p-6 sm:p-7"
                  : "h-full rounded-[2rem] border border-white/80 bg-white/78 p-6 sm:p-7"
              }
            >
              <p
                className={
                  index === 0 || index === featureCards.length - 1
                    ? "text-sm font-semibold uppercase tracking-[0.18em] text-[#d9f6bc]"
                    : "text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)]"
                }
              >
                {card.eyebrow}
              </p>
              <h3
                className={
                  index === 0 || index === featureCards.length - 1
                    ? "mt-4 text-[1.95rem] font-semibold leading-tight tracking-[-0.04em] text-white"
                    : "mt-4 text-[1.95rem] font-semibold leading-tight tracking-[-0.04em] text-[color:var(--ink)]"
                }
              >
                {card.title}
              </h3>
              <p
                className={
                  index === 0 || index === featureCards.length - 1
                    ? "mt-4 text-base leading-7 text-white/72"
                    : "mt-4 text-base leading-7 text-[color:var(--muted)]"
                }
              >
                {card.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
