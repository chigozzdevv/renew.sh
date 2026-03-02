import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function CTASection() {
  return (
    <section id="contact" className="pb-16 pt-4 sm:pb-20 sm:pt-6">
      <Container>
        <Reveal
          className="rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-[0_24px_80px_rgba(18,33,23,0.06)] sm:p-8 lg:p-10"
          offset={24}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
            <div className="max-w-2xl">
              <h2 className="max-w-[11ch] text-balance font-display text-4xl leading-[0.98] tracking-[-0.06em] text-[color:var(--ink)] sm:text-[3.15rem]">
                Start billing with Renew.
              </h2>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row lg:flex-col lg:items-end">
              <ButtonLink href="mailto:hello@renew.sh" className="px-7 py-3.5">
                Get started
              </ButtonLink>
              <ButtonLink href="/docs" variant="secondary" className="px-7 py-3.5">
                View docs
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
