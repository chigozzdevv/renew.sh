"use client";

import { cn } from "@/lib/utils";
import type { BillingMarketCatalogEntry } from "@/lib/markets";

export function formatMarketOptionLabel(option: BillingMarketCatalogEntry) {
  const countrySummary =
    option.countries.length > 2
      ? `${option.countries.slice(0, 2).join(", ")} +${option.countries.length - 2}`
      : option.countries.join(", ");

  return countrySummary
    ? `${option.currency} · ${option.currencyName} · ${countrySummary}`
    : `${option.currency} · ${option.currencyName}`;
}

export function MarketMultiSelect({
  options,
  value,
  onChange,
  allLabel,
}: {
  options: BillingMarketCatalogEntry[];
  value: string[];
  onChange: (value: string[]) => void;
  allLabel?: string;
}) {
  const selected = new Set(value);
  const optionCodes = options.map((option) => option.currency);
  const allSelected =
    optionCodes.length > 0 && optionCodes.every((currency) => selected.has(currency));

  function toggleCurrency(currency: string) {
    const next = new Set(selected);

    if (next.has(currency)) {
      next.delete(currency);
    } else {
      next.add(currency);
    }

    onChange(optionCodes.filter((code) => next.has(code)));
  }

  function toggleAll() {
    onChange(allSelected ? [] : optionCodes);
  }

  return (
    <div className="space-y-3">
      {allLabel ? (
        <button
          type="button"
          onClick={toggleAll}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
            allSelected
              ? "border-[#0c4a27] bg-[#0c4a27] text-[#d9f6bc]"
              : "border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:bg-[#f7fbf5]"
          )}
        >
          {allLabel}
        </button>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.has(option.currency);

          return (
            <button
              key={option.currency}
              type="button"
              onClick={() => toggleCurrency(option.currency)}
              className={cn(
                "rounded-2xl border px-3 py-2 text-left transition-colors",
                isSelected
                  ? "border-[#0c4a27] bg-[#0c4a27] text-[#d9f6bc]"
                  : "border-[color:var(--line)] bg-white text-[color:var(--ink)] hover:bg-[#f7fbf5]"
              )}
            >
              <p className="text-sm font-semibold tracking-[-0.02em]">{option.currency}</p>
              <p className={cn("mt-1 text-xs", isSelected ? "text-[#d9f6bc]/76" : "text-[color:var(--muted)]")}>
                {option.currencyName}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
