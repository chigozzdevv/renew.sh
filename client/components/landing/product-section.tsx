import { featureCards } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function ProductSection() {
  return (
    <section id="product" className="pb-24 pt-2">
      <Container>
        <Reveal className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--brand)]">
            Product surface
          </p>
          <h2 className="mt-4 font-display text-5xl leading-[0.94] tracking-[-0.08em] text-[color:var(--ink)] sm:text-6xl">
            Built for the real billing path, not just the payment button.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
            The client is split around merchant operations, payer checkout, and a shared chain layer so the interface stays clean while settlement logic stays correct.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {featureCards.map((card, index) => (
            <Reveal key={card.title} delay={0.08 * (index + 1)} className="glow-panel p-6 sm:p-7">
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
