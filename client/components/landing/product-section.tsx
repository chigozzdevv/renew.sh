"use client";

import { useEffect, useRef, useState } from "react";

import { featureCards } from "@/lib/content";
import { motion } from "framer-motion";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function WhyRenewSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const visibilityScores = useRef<number[]>(featureCards.map(() => 0));

  useEffect(() => {
    const cards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);

    if (!cards.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          visibilityScores.current[index] = entry.isIntersecting ? entry.intersectionRatio : 0;
        }

        const nextIndex = visibilityScores.current.reduce((bestIndex, score, index, scores) => {
          if (score > scores[bestIndex]) {
            return index;
          }

          return bestIndex;
        }, 0);

        setActiveIndex(nextIndex);
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.65, 0.8],
        rootMargin: "-18% 0px -42% 0px",
      },
    );

    for (const card of cards) {
      observer.observe(card);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section id="why-renew" className="pb-24 pt-6 sm:pb-28 sm:pt-8">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
          <Reveal className="lg:sticky lg:top-28 lg:self-start" offset={24}>
            <div className="max-w-xl">
              <h2 className="font-display text-4xl leading-[0.98] tracking-[-0.06em] text-[color:var(--ink)] sm:text-[3.25rem]">
                Built for billing that repeats.
              </h2>

              <div className="mt-8 grid gap-3">
                {featureCards.map((card, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <div
                      key={card.eyebrow}
                      className="relative overflow-hidden rounded-2xl border border-black/6 px-4 py-3"
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="why-renew-active"
                          className="absolute inset-0 rounded-2xl bg-[#121312]"
                          transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 30,
                          }}
                        />
                      ) : null}
                      <div className="relative flex items-center gap-3">
                        <span
                          className={
                            isActive
                              ? "h-2 w-2 rounded-full bg-[#d9f6bc]"
                              : "h-2 w-2 rounded-full bg-[color:var(--line)]"
                          }
                        />
                        <p
                          className={
                            isActive
                              ? "text-sm font-semibold uppercase tracking-[0.22em] text-[#d9f6bc]"
                              : "text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]"
                          }
                        >
                          {card.eyebrow}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5">
            {featureCards.map((card, index) => {
              const isDarkCard = index % 2 === 0;

              return (
                <Reveal
                  key={card.title}
                  delay={0.1 * (index + 1)}
                  offset={26}
                  className="h-full"
                >
                  <div
                    ref={(element) => {
                      cardRefs.current[index] = element;
                    }}
                    data-index={index}
                    className={
                      isDarkCard
                        ? "rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_34%),linear-gradient(180deg,#181918_0%,#111111_100%)] p-6 sm:p-7"
                        : "rounded-[2rem] border border-black/6 bg-white/92 p-6 sm:p-7"
                    }
                  >
                    <h3
                      className={
                        isDarkCard
                          ? "max-w-[11ch] text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.25rem]"
                          : "max-w-[11ch] text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[color:var(--ink)] sm:text-[2.25rem]"
                      }
                    >
                      {card.title}
                    </h3>
                    <p
                      className={
                        isDarkCard
                          ? "mt-4 max-w-[24ch] text-base leading-7 text-white/70"
                          : "mt-4 max-w-[24ch] text-base leading-7 text-[color:var(--muted)]"
                      }
                    >
                      {card.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
