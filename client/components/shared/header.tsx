"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { landingNav } from "@/lib/content";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      setIsScrolled(currentScrollY > 12);

      if (currentScrollY <= 12) {
        setIsVisible(true);
      } else if (Math.abs(delta) > 4) {
        setIsVisible(delta < 0);
      }

      lastScrollY.current = currentScrollY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 py-5 transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "-translate-y-[140%]",
      )}
    >
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
            <Logo />
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
