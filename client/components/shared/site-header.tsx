"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { landingNav } from "@/lib/content";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 py-5">
      <Container>
        <div
          className={cn(
            "flex items-center justify-between rounded-full px-5 py-3 transition-all duration-300",
            isScrolled
              ? "border border-white/70 bg-white/70"
              : "border border-transparent bg-transparent",
          )}
        >
          <Link href="/" aria-label="Renew home" className="shrink-0">
            <BrandMark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {landingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)] transition-colors hover:text-[color:var(--brand)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center">
            <ButtonLink href="#contact">Start accepting payments</ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
