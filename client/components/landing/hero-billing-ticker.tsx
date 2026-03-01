"use client";

import { useEffect, useMemo, useState } from "react";

type HeroBillingTickerProps = {
  codes: readonly string[];
  className?: string;
};

const TYPING_DELAY_MS = 95;
const DELETING_DELAY_MS = 55;
const HOLD_DELAY_MS = 1200;
const NEXT_DELAY_MS = 240;

function buildLabel(code: string) {
  return `Bill in ${code}.`;
}

export function HeroBillingTicker({ codes, className }: HeroBillingTickerProps) {
  const labels = useMemo(() => codes.map(buildLabel), [codes]);
  const longestLabel = useMemo(
    () => labels.reduce((longest, current) => (current.length > longest.length ? current : longest), ""),
    [labels],
  );

  const [index, setIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (labels.length === 0) {
      return;
    }

    const currentLabel = labels[index];

    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isDeleting && visibleText !== currentLabel) {
      timeoutId = setTimeout(() => {
        setVisibleText(currentLabel.slice(0, visibleText.length + 1));
      }, TYPING_DELAY_MS);
    } else if (!isDeleting && visibleText === currentLabel) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true);
      }, HOLD_DELAY_MS);
    } else if (isDeleting && visibleText.length > 0) {
      timeoutId = setTimeout(() => {
        setVisibleText(currentLabel.slice(0, visibleText.length - 1));
      }, DELETING_DELAY_MS);
    } else {
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
        setIndex((currentIndex) => (currentIndex + 1) % labels.length);
      }, NEXT_DELAY_MS);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [index, isDeleting, labels, visibleText]);

  if (labels.length === 0) {
    return null;
  }

  return (
    <span className={`grid ${className ?? ""}`}>
      <span className="invisible col-start-1 row-start-1">{longestLabel}</span>
      <span className="col-start-1 row-start-1 inline-flex items-center">
        <span>{visibleText}</span>
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-[0.9em] w-[0.08em] bg-current opacity-90 animate-[hero-caret_0.9s_steps(1,end)_infinite]"
        />
      </span>
    </span>
  );
}
