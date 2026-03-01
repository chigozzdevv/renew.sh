import type { ReactNode } from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variants = {
  primary:
    "bg-[color:var(--brand)] text-white hover:bg-[#0b4322]",
  secondary:
    "border border-[color:var(--line)] bg-white/75 text-[color:var(--ink)] hover:bg-white",
  ghost:
    "text-[color:var(--ink)] hover:bg-black/5"
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors duration-200",
        variants[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}
