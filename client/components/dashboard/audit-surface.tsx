"use client";

import { useEffect, useMemo, useState } from "react";

import { formatDateTime, StatusBadge } from "@/components/dashboard/surface-utils";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  Card,
  MetricCard,
  PageState,
  Select,
  StatGrid,
  Table,
  TableRow,
  Input,
} from "@/components/dashboard/ui";
import { loadAuditLogs, type AuditCategory, type AuditStatus } from "@/lib/audit";

export function AuditSurface() {
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [status, setStatus] = useState<AuditStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadAuditLogs({
        token,
        merchantId,
        category,
        status,
        search,
        page,
      }),
    [category, page, search, status]
  );

  const items = data?.items ?? [];
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  useEffect(() => {
    if (!selectedItem) {
      setSelectedId(null);
      return;
    }

    setSelectedId(selectedItem.id);
  }, [selectedItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    const warning = items.filter((item) => item.status === "warning").length;
    const errorCount = items.filter((item) => item.status === "error").length;
    const treasury = items.filter((item) => item.category === "treasury").length;

    return {
      total: data?.pagination.total ?? 0,
      warning,
      error: errorCount,
      treasury,
    };
  }, [data?.pagination.total, items]);

  if (isLoading && !data) {
    return <PageState title="Loading audit log" message="Fetching real audit events." />;
  }

  if (error || !data) {
    return (
      <PageState
        title="Audit unavailable"
        message={error ?? "Unable to load audit log."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard label="Audit events" value={String(metrics.total)} note="Matched records" tone="brand" />
        <MetricCard label="Warnings" value={String(metrics.warning)} note="Current page" />
        <MetricCard label="Errors" value={String(metrics.error)} note="Current page" />
        <MetricCard label="Treasury" value={String(metrics.treasury)} note="Treasury-linked events" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card title="Audit log" description="Real workspace, billing, treasury, and developer events.">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={category} onChange={(event) => { setCategory(event.target.value as AuditCategory | "all"); setPage(1); }}>
                <option value="all">All categories</option>
                <option value="workspace">Workspace</option>
                <option value="team">Team</option>
                <option value="billing">Billing</option>
                <option value="security">Security</option>
                <option value="developer">Developer</option>
                <option value="payments">Payments</option>
                <option value="treasury">Treasury</option>
                <option value="protocol">Protocol</option>
              </Select>
              <Select value={status} onChange={(event) => { setStatus(event.target.value as AuditStatus | "all"); setPage(1); }}>
                <option value="all">All statuses</option>
                <option value="ok">OK</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </Select>
              <Input placeholder="Search actor, target, or action" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>

            <Table columns={["Actor", "Action", "Category", "Time", "Status"]}>
              {items.map((item) => (
                <button key={item.id} type="button" className="text-left" onClick={() => setSelectedId(item.id)}>
                  <TableRow columns={5}>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{item.actor}</p>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{item.action}</p>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{item.target ?? item.detail}</p>
                    </div>
                    <p className="text-sm text-[color:var(--muted)]">{item.category}</p>
                    <p className="text-sm text-[color:var(--muted)]">{formatDateTime(item.createdAt)}</p>
                    <div><StatusBadge value={item.status} /></div>
                  </TableRow>
                </button>
              ))}
            </Table>

            <div className="flex items-center justify-between gap-3">
              <button
                className="text-sm font-semibold text-[color:var(--ink)] disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <p className="text-sm text-[color:var(--muted)]">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </p>
              <button
                className="text-sm font-semibold text-[color:var(--ink)] disabled:opacity-40"
                disabled={page >= data.pagination.totalPages}
                onClick={() =>
                  setPage((current) => Math.min(data.pagination.totalPages, current + 1))
                }
              >
                Next
              </button>
            </div>
          </div>
        </Card>

        <Card title={selectedItem?.action ?? "Audit detail"} description={selectedItem?.detail ?? "Select an audit event to inspect it."}>
          {selectedItem ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Actor</p>
                  <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{selectedItem.actor}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Status</p>
                  <div className="mt-2"><StatusBadge value={selectedItem.status} /></div>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Category</p>
                  <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{selectedItem.category}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Time</p>
                  <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{formatDateTime(selectedItem.createdAt)}</p>
                </div>
              </div>

              {selectedItem.target ? (
                <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Target</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--ink)]">{selectedItem.target}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">Metadata</p>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-[#f7faf6] p-3 text-xs leading-6 text-[color:var(--ink)]">
                  {JSON.stringify(selectedItem.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              No audit event matches the current filter.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
