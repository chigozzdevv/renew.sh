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
          <h2 className="mt-4 font-display text-5xl leading-[0.94] tracking-[-0.08em] text-[color:var(--ink)] sm:text-6xl">
            Built for modern billing, not just one-off payment collection.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[color:var(--muted)]">
            Renew gives operators a cleaner billing layer that keeps customer pricing local, treasury settlement stablecoin-native, and billing logic ready for repeatable charges.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card, index) => (
            <Reveal
              key={card.title}
              delay={0.08 * (index + 1)}
              className="glow-panel h-full p-6 sm:p-7"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)]">
                {card.eyebrow}
              </p>
              <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.04em] text-[color:var(--ink)]">
                {card.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">{card.body}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
