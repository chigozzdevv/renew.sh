export function Logo() {
  return (
    <div className="inline-flex items-center gap-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-8 w-8 text-[color:var(--brand)]"
        fill="none"
      >
        <circle cx="9" cy="9" r="5" fill="currentColor" />
        <circle cx="23" cy="9" r="5" fill="currentColor" opacity="0.92" />
        <circle cx="9" cy="23" r="5" fill="currentColor" opacity="0.78" />
        <circle cx="23" cy="23" r="5" fill="currentColor" opacity="0.62" />
      </svg>
      <span className="font-display text-3xl font-semibold tracking-[-0.06em] text-[color:var(--ink)]">
        renew
      </span>
    </div>
  );
}
