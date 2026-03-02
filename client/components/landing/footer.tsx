import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="pb-10 pt-2 sm:pb-12">
      <Container>
        <div className="flex flex-col gap-5 border-t border-[color:var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <p className="text-sm text-[color:var(--muted)]">
              Local-fiat billing, USDC settlement.
            </p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-[color:var(--muted)] sm:items-end">
            <a
              href="mailto:hello@renew.sh"
              className="font-medium transition-colors hover:text-[color:var(--brand)]"
            >
              hello@renew.sh
            </a>
            <p>© {new Date().getFullYear()} Renew</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
