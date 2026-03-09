"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { landingMoreNav, landingPrimaryNav } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { useGetStartedHref } from "@/components/shared/get-started";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isDocsRoute = pathname === "/docs";
  const isPlaygroundRoute = pathname === "/playground";
  const moreLabel = isPlaygroundRoute ? "Playground" : "More";
  const getStartedHref = useGetStartedHref();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const lastScrollY = useRef(0);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

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
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsMobileMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMenuOpen(false);
        setIsMobileMoreOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
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
            "rounded-[1.75rem] px-5 py-3 transition-all duration-300 max-sm:px-3",
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
              {landingPrimaryNav.map((item) => {
                const isActive = item.href === "/docs" && isDocsRoute;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "text-sm font-semibold tracking-[-0.02em] transition-colors",
                      isScrolled
                        ? "text-white/92 hover:text-[#d9f6bc]"
                        : "text-[color:var(--ink)] hover:text-[color:var(--brand)]",
                      isActive &&
                        (isScrolled
                          ? "text-[#d9f6bc]"
                          : "text-[color:var(--brand)]"),
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  aria-expanded={isMoreOpen}
                  onClick={() => setIsMoreOpen((current) => !current)}
                  className={cn(
                    "relative inline-flex items-center gap-2 pb-1 text-sm font-semibold tracking-[-0.02em] transition-colors",
                    isScrolled
                      ? "text-white/92 hover:text-[#d9f6bc]"
                      : "text-[color:var(--ink)] hover:text-[color:var(--brand)]",
                    (isDocsRoute || isPlaygroundRoute) &&
                      (isScrolled ? "text-[#d9f6bc]" : "text-[color:var(--brand)]"),
                    isPlaygroundRoute &&
                      "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-current",
                  )}
                >
                  {moreLabel}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 14 14"
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isMoreOpen ? "rotate-180" : "",
                    )}
                    fill="none"
                  >
                    <path
                      d="M3.25 5.25L7 9L10.75 5.25"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div
                  className={cn(
                    "absolute left-1/2 top-[calc(100%+0.9rem)] w-56 -translate-x-1/2 rounded-[1.5rem] border p-2 shadow-[0_24px_64px_rgba(8,18,11,0.14)] transition-all duration-200",
                    isScrolled
                      ? "border-white/10 bg-[#121312]/96"
                      : "border-black/6 bg-white/96",
                    isMoreOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0",
                  )}
                >
                  <div className="flex flex-col gap-1">
                    {landingMoreNav.map((item) => {
                      const isActive =
                        (item.href === "/docs" && isDocsRoute) ||
                        (item.href === "/playground" && isPlaygroundRoute);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors",
                            isScrolled
                              ? "text-white/92 hover:bg-white/6 hover:text-[#d9f6bc]"
                              : "text-[color:var(--ink)] hover:bg-black/5 hover:text-[color:var(--brand)]",
                            isActive &&
                              (isScrolled
                                ? "bg-white/8 text-[#d9f6bc]"
                                : "bg-[color:var(--brand)]/8 text-[color:var(--brand)]"),
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href={getStartedHref}
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
                {landingPrimaryNav.map((item) => {
                  const isActive = item.href === "/docs" && isDocsRoute;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors",
                        isScrolled
                          ? "text-white/92 hover:bg-white/6 hover:text-[#d9f6bc]"
                          : "text-[color:var(--ink)] hover:bg-black/5 hover:text-[color:var(--brand)]",
                        isActive &&
                          (isScrolled
                            ? "bg-white/8 text-[#d9f6bc]"
                            : "bg-[color:var(--brand)]/8 text-[color:var(--brand)]"),
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}

                <div
                  className={cn(
                    "rounded-2xl border px-3 py-2",
                    isScrolled ? "border-white/8 bg-white/4" : "border-black/5 bg-black/0",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setIsMobileMoreOpen((current) => !current)}
                    aria-expanded={isMobileMoreOpen}
                    className={cn(
                      "flex w-full items-center justify-between py-1 text-sm font-semibold tracking-[-0.02em] transition-colors",
                      isScrolled ? "text-white/92" : "text-[color:var(--ink)]",
                    )}
                  >
                    <span>More</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 14 14"
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isMobileMoreOpen ? "rotate-180" : "",
                      )}
                      fill="none"
                    >
                      <path
                        d="M3.25 5.25L7 9L10.75 5.25"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-[max-height,opacity,margin-top] duration-200",
                      isMobileMoreOpen ? "mt-2 max-h-56 opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      {landingMoreNav.map((item) => {
                        const isActive =
                          (item.href === "/docs" && isDocsRoute) ||
                          (item.href === "/playground" && isPlaygroundRoute);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsMobileMoreOpen(false);
                            }}
                            className={cn(
                              "rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors",
                              isScrolled
                                ? "text-white/92 hover:bg-white/6 hover:text-[#d9f6bc]"
                                : "text-[color:var(--ink)] hover:bg-black/5 hover:text-[color:var(--brand)]",
                              isActive &&
                                (isScrolled
                                  ? "bg-white/8 text-[#d9f6bc]"
                                  : "bg-[color:var(--brand)]/8 text-[color:var(--brand)]"),
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </Container>
    </header>
  );
}
