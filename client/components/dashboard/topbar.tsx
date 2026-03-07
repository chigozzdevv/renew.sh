import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { cn } from "@/lib/utils";

type DashboardTopbarProps = {
  onOpenSidebar: () => void;
};

export function DashboardTopbar({ onOpenSidebar }: DashboardTopbarProps) {
  const { mode, isUpdating, setMode } = useWorkspaceMode();
  const { user } = useDashboardSession();

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[#f4f7f1]/88 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/82 text-[color:var(--ink)] lg:hidden"
          aria-label="Open dashboard navigation"
        >
          <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4" fill="none">
            <path
              d="M3 5H15"
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
              d="M3 13H11"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search dashboard</span>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-4 inline-flex items-center text-[color:var(--muted)]">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M10.5 10.5L13.5 13.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search customers, plans, payments"
              className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/88 pl-11 pr-4 text-sm font-medium tracking-[-0.02em] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--muted)] focus:border-[#0c4a27]"
            />
          </span>
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded-2xl border border-[color:var(--line)] bg-white/82 p-1">
            <button
              type="button"
              onClick={() => void setMode("test")}
              disabled={isUpdating}
              aria-pressed={mode === "test"}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                mode === "test"
                  ? "bg-[#0c4a27] text-[#d9f6bc]"
                  : "text-[color:var(--muted)]"
              )}
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => void setMode("live")}
              disabled={isUpdating}
              aria-pressed={mode === "live"}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                mode === "live"
                  ? "bg-[#0c4a27] text-[#d9f6bc]"
                  : "text-[color:var(--muted)]"
              )}
            >
              Live
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/82 text-[color:var(--ink)]"
            aria-label="Open notifications"
          >
            <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4" fill="none">
              <path
                d="M9 3.5C6.79 3.5 5 5.29 5 7.5V9.31C5 9.7 4.85 10.08 4.57 10.36L3.75 11.18C3.12 11.81 3.56 12.88 4.46 12.88H13.54C14.44 12.88 14.88 11.81 14.25 11.18L13.43 10.36C13.15 10.08 13 9.7 13 9.31V7.5C13 5.29 11.21 3.5 9 3.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M7.25 14.25C7.58 14.83 8.22 15.25 9 15.25C9.78 15.25 10.42 14.83 10.75 14.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white/82 px-3"
            aria-label="Open workspace profile"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0c4a27] text-xs font-semibold text-[#d9f6bc]">
              {user?.name
                ? user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")
                : "RW"}
            </span>
            <span className="hidden text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)] sm:inline">
              {user?.name ?? "Renew Labs"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
