"use client";

import { useRef } from "react";

import type { MotionValue } from "framer-motion";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { Container } from "@/components/ui/container";

const leadCopy =
  "Charge customers in local fiat and settle in USDC on Avalanche — built for recurring and usage-based billing.";
const leadWords = leadCopy.split(" ");

type RevealWordProps = {
  progress: MotionValue<number>;
  word: string;
  index: number;
  total: number;
};

function RevealWord({ progress, word, index, total }: RevealWordProps) {
  const start = (index / total) * 0.72;
  const end = start + 0.22;
  const color = useTransform(
    progress,
    [start, end],
    ["rgba(77, 99, 81, 0.24)", "rgba(12, 74, 39, 1)"],
  );

  return (
    <motion.span style={{ color }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}

export function Lead() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <section id="overview" ref={sectionRef} className="relative min-h-[150svh] sm:min-h-[160svh] lg:min-h-[170svh]">
      <div className="sticky top-[5.75rem] flex min-h-[calc(100svh-5.75rem)] items-start pt-6 sm:pt-8 lg:pt-10">
        <Container>
          <div className="mx-auto max-w-5xl">
            <p className="text-balance font-display text-[clamp(2rem,4.7vw,4.4rem)] leading-[1.04] tracking-[-0.06em] text-[#0c4a27]">
              {shouldReduceMotion
                ? leadCopy
                : leadWords.map((word, index) => (
                    <RevealWord
                      key={`${word}-${index}`}
                      progress={scrollYProgress}
                      word={word}
                      index={index}
                      total={leadWords.length}
                    />
                  ))}
            </p>
          </div>
        </Container>
      </div>
    </section>
  );
}
