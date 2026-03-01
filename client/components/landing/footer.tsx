import Link from "next/link";

import { landingNav } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer id="contact" className="pb-12">
      <Container>
        <div className="rounded-[2.25rem] border border-white/80 bg-white/65 p-6 shadow-[0_24px_80px_rgba(18,33,23,0.06)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Logo />
              <p className="mt-5 text-lg leading-8 text-[color:var(--muted)]">
                Renew is building a merchant-grade operating layer for stablecoin billing, settlement, and treasury visibility on Avalanche.
              </p>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              {landingNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)] transition-colors hover:text-[color:var(--brand)]"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href="mailto:hello@renew.sh"
                className="inline-flex items-center justify-center rounded-full bg-[color:var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(12,76,39,0.18)]"
              >
                hello@renew.sh
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
