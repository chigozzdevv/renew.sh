import { proofItems } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function ProofStrip() {
  return (
    <section className="pb-20">
      <Container>
        <Reveal className="grid gap-4 rounded-[2rem] border border-white/75 bg-white/60 p-5 shadow-[0_24px_80px_rgba(18,33,23,0.06)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
          {proofItems.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 px-5 py-6">
              <p className="font-display text-4xl tracking-[-0.08em] text-[color:var(--ink)]">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-[color:var(--muted)]">
                {item.label}
              </p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}

