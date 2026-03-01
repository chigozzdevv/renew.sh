import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Header } from "@/components/shared/header";

export default function DocsPage() {
  return (
    <div className="page-shell">
      <Header />
      <main className="pb-20 pt-8 sm:pt-12 lg:pb-28">
        <Container>
          <section className="glow-panel mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--brand)]">
              Documentation
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,8vw,6rem)] leading-[0.92] tracking-[-0.08em] text-[color:var(--ink)]">
              Renew docs are being organized.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
              This route is reserved for product, integration, and billing guides.
              For now, use the landing page as the working product surface.
            </p>
            <div className="mt-10">
              <ButtonLink href="/">Back to home</ButtonLink>
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}
