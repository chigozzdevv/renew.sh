import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { HeroBillingTicker } from "@/components/landing/hero-billing-ticker";
import { HeroNetworkPattern } from "@/components/landing/hero-network-pattern";
import { supportedBillingFiatCodes } from "@/lib/content";

export function Hero() {
  return (
    <section className="relative z-0 flex min-h-[calc(100svh-6.5rem)] items-center overflow-hidden pb-20 pt-8 isolate sm:pb-24 lg:min-h-[calc(100svh-7rem)] lg:pb-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),rgba(255,255,255,0)_62%)]" />
      <HeroNetworkPattern />

      <Container className="relative z-10 w-full">
        <div className="mx-auto w-fit">
          <Reveal delay={0.05}>
            <h1 className="font-display leading-[0.9] tracking-[-0.08em] text-[color:var(--ink)]">
              <HeroBillingTicker
                codes={supportedBillingFiatCodes}
                className="block text-[clamp(3.3rem,8vw,6.8rem)]"
              />
              <span className="block text-[clamp(2.8rem,6.7vw,5.8rem)]">
                Settle in USDC.
              </span>
            </h1>
          </Reveal>

          <Reveal className="mt-8 flex flex-col items-start gap-3 sm:flex-row" delay={0.12}>
            <ButtonLink href="#contact" className="px-7 py-3.5">
              Get started
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" className="px-7 py-3.5">
              View docs
            </ButtonLink>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
