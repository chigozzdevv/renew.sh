"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { landingNav } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
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
            "rounded-[1.75rem] px-3 py-3 transition-all duration-300 sm:px-5",
            isScrolled
              ? "border border-white/10 bg-[#121312]/95"
              : "border border-transparent bg-transparent",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Renew home" className="shrink-0">
              <Logo inverted={isScrolled} />
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
              {landingNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-semibold tracking-[-0.02em] transition-colors",
                    isScrolled
                      ? "text-white/92 hover:text-[#d9f6bc]"
                      : "text-[color:var(--ink)] hover:text-[color:var(--brand)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="#contact"
                className="group inline-flex items-center gap-2.5"
                onClick={() => setIsMenuOpen(false)}
              >
                <span
                  className={cn(
                    "hidden text-base font-semibold tracking-[-0.03em] transition-colors sm:inline",
                    isScrolled ? "text-white" : "text-[color:var(--ink)]",
                  )}
                >
                  Get started
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0c4a27] text-[#d9f6bc] transition-colors duration-200 group-hover:bg-[#093a1e]">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                  >
                    <path
                      d="M3.5 12.5L12.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6 3.5h6.5V10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>

              <button
                type="button"
                aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((current) => !current)}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden",
                  isScrolled
                    ? "bg-white/8 text-white hover:bg-white/12"
                    : "bg-black/5 text-[color:var(--ink)] hover:bg-black/8",
                )}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 18 18"
                  className="h-4 w-4"
                  fill="none"
                >
                  {isMenuOpen ? (
                    <>
                      <path
                        d="M4 4L14 14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M14 4L4 14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M3 5.25H15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M3 9H15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M3 12.75H15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-[max-height,margin-top,opacity] duration-300 ease-out lg:hidden",
              isMenuOpen ? "mt-3 max-h-72 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <nav
              aria-label="Mobile primary"
              className={cn(
                "rounded-[1.5rem] border px-4 py-4",
                isScrolled
                  ? "border-white/10 bg-white/4"
                  : "border-black/5 bg-white/90",
              )}
            >
              <div className="flex flex-col gap-1">
                {landingNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors",
                      isScrolled
                        ? "text-white/92 hover:bg-white/6 hover:text-[#d9f6bc]"
                        : "text-[color:var(--ink)] hover:bg-black/5 hover:text-[color:var(--brand)]",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </Container>
    </header>
  );
}
