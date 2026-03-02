import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export default function WaitlistPage() {
  return (
    <div className="page-shell min-h-screen">
      <main className="pb-16 pt-6 sm:pb-20 sm:pt-8">
        <Container>
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Renew home" className="shrink-0">
              <Logo />
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--muted)] transition-colors hover:text-[color:var(--brand)]"
            >
              Back to home
            </Link>
          </div>

          <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">
            <div className="lg:sticky lg:top-8">
              <h1 className="max-w-[10ch] font-display text-[clamp(3rem,8vw,6rem)] leading-[0.92] tracking-[-0.08em] text-[color:var(--ink)]">
                Join the Renew waitlist.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--muted)] sm:text-lg sm:leading-8">
                Leave your details and we will reach out as we open access for teams
                building modern billing flows.
              </p>
            </div>

            <div className="glow-panel px-6 py-7 sm:px-8 sm:py-8">
              <WaitlistForm />
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}
