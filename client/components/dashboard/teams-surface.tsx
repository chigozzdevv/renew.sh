"use client";

import { useEffect, useMemo, useState } from "react";

import { MarketMultiSelect } from "@/components/dashboard/market-controls";
import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import {
  StatusBadge,
  formatDateTime,
  toErrorMessage,
} from "@/components/dashboard/surface-utils";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  Button,
  Card,
  DarkCard,
  DarkField,
  Input,
  MetricCard,
  PageState,
  Select,
  StatGrid,
  Table,
  TableRow,
} from "@/components/dashboard/ui";
import { loadBillingMarketCatalog } from "@/lib/markets";
import {
  createTeamMember,
  deleteTeamMember,
  loadTeamMembers,
  resendInvite,
  revokeInvite,
  syncRoleDefaults,
  updateTeamMember,
  type TeamMemberRecord,
  type TeamRole,
} from "@/lib/teams";

type TeamStatusFilter = TeamMemberRecord["status"] | "all";
type TeamRoleFilter = TeamRole | "all";

const roleOptions: TeamRole[] = [
  "owner",
  "admin",
  "operations",
  "finance",
  "developer",
  "support",
];

export function TeamsSurface() {
  const { token, user } = useDashboardSession();
  const { mode } = useWorkspaceMode();
  const [status, setStatus] = useState<TeamStatusFilter>("all");
  const [role, setRole] = useState<TeamRoleFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteDraft, setInviteDraft] = useState({
    name: "",
    email: "",
    role: "support" as TeamRole,
    markets: [] as string[],
  });

  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadTeamMembers({
        token,
        merchantId,
        role,
        status,
        search,
      }),
    [role, search, status]
  );
  const { data: marketCatalog } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadBillingMarketCatalog({
        token,
        merchantId,
        environment: mode,
      }),
    [mode]
  );

  const members = data ?? [];
  const supportedMarkets =
    marketCatalog?.markets.filter((market) =>
      marketCatalog.merchantSupportedMarkets.includes(market.currency)
    ) ?? [];
  const selectedMember = members.find((member) => member.id === selectedId) ?? members[0] ?? null;

  useEffect(() => {
    if (!selectedMember) {
      setSelectedId(null);
      return;
    }

    setSelectedId(selectedMember.id);
  }, [selectedMember?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!message && !errorMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
      setErrorMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [errorMessage, message]);

  useEffect(() => {
    if (!marketCatalog?.merchantSupportedMarkets.length) {
      return;
    }

    setInviteDraft((current) =>
      current.markets.length > 0
        ? current
        : { ...current, markets: marketCatalog.merchantSupportedMarkets }
    );
  }, [marketCatalog]);

  const metrics = useMemo(
    () => ({
      total: members.length,
      active: members.filter((member) => member.status === "active").length,
      invited: members.filter((member) => member.status === "invited").length,
      treasury: members.filter((member) => member.permissions.includes("treasury")).length,
    }),
    [members]
  );

  async function runAction(key: string, runner: () => Promise<void>) {
    setIsBusy(key);
    setMessage(null);
    setErrorMessage(null);

    try {
      await runner();
      await reload();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setIsBusy(null);
    }
  }

  async function handleInvite() {
    if (!token || !user?.merchantId) {
      return;
    }

    await runAction("invite-member", async () => {
      await createTeamMember({
        token,
        merchantId: user.merchantId,
        name: inviteDraft.name.trim(),
        email: inviteDraft.email.trim(),
        role: inviteDraft.role,
        markets: inviteDraft.markets,
      });
      setInviteDraft({
        name: "",
        email: "",
        role: "support",
        markets: marketCatalog?.merchantSupportedMarkets ?? [],
      });
      setMessage("Invite sent.");
    });
  }

  async function handleRoleChange(nextRole: TeamRole) {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("update-role", async () => {
      await updateTeamMember({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
        payload: {
          role: nextRole,
        },
      });
      setMessage("Role updated.");
    });
  }

  async function handleStatusChange(nextStatus: TeamMemberRecord["status"]) {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("update-status", async () => {
      await updateTeamMember({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
        payload: {
          status: nextStatus,
        },
      });
      setMessage("Member updated.");
    });
  }

  async function handleSyncRole() {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("sync-role", async () => {
      await syncRoleDefaults({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
      });
      setMessage("Role defaults synced.");
    });
  }

  async function handleResendInvite() {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("resend-invite", async () => {
      await resendInvite({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
      });
      setMessage("Invite resent.");
    });
  }

  async function handleRevokeInvite() {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("revoke-invite", async () => {
      await revokeInvite({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
      });
      setMessage("Invite revoked.");
    });
  }

  async function handleDeleteMember() {
    if (!token || !selectedMember) {
      return;
    }

    await runAction("delete-member", async () => {
      await deleteTeamMember({
        token,
        merchantId: selectedMember.merchantId,
        teamMemberId: selectedMember.id,
      });
      setMessage("Member removed.");
    });
  }

  if (isLoading && !data) {
    return <PageState title="Loading team" message="Fetching team membership and access state." />;
  }

  if (error || !data) {
    return (
      <PageState
        title="Teams unavailable"
        message={error ?? "Unable to load team data."}
        tone="danger"
        action={<button className="text-sm font-semibold" onClick={() => void reload()}>Retry</button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatGrid>
        <MetricCard label="Members" value={String(metrics.total)} note="Workspace access records" tone="brand" />
        <MetricCard label="Active" value={String(metrics.active)} note="Signed in access" />
        <MetricCard label="Invited" value={String(metrics.invited)} note="Pending acceptance" />
        <MetricCard label="Treasury" value={String(metrics.treasury)} note="Can approve treasury" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card title="Team members" description="Role-based access for this account.">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={role} onChange={(event) => setRole(event.target.value as TeamRoleFilter)}>
                <option value="all">All roles</option>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(event) => setStatus(event.target.value as TeamStatusFilter)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
              </Select>
              <Input placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>

            <div className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-[#f7faf6] p-4 md:grid-cols-2">
              <Input placeholder="Name" value={inviteDraft.name} onChange={(event) => setInviteDraft((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Email" value={inviteDraft.email} onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))} />
              <Select value={inviteDraft.role} onChange={(event) => setInviteDraft((current) => ({ ...current, role: event.target.value as TeamRole }))}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <div className="space-y-3 md:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  Market access
                </p>
                <MarketMultiSelect
                  options={supportedMarkets}
                  value={inviteDraft.markets}
                  onChange={(markets) => setInviteDraft((current) => ({ ...current, markets }))}
                  allLabel="All merchant markets"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  tone="brand"
                  disabled={
                    isBusy === "invite-member" ||
                    !inviteDraft.name.trim() ||
                    !inviteDraft.email.trim() ||
                    inviteDraft.markets.length === 0
                  }
                  onClick={() => void handleInvite()}
                >
                  {isBusy === "invite-member" ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </div>

            {message ? <p className="text-sm text-[color:var(--brand)]">{message}</p> : null}
            {errorMessage ? <p className="text-sm text-[#a8382b]">{errorMessage}</p> : null}

            <div className="max-h-[34rem] overflow-y-auto pr-1">
              <Table columns={["Member", "Role", "Access", "Last active", "Status"]}>
                {members.map((member) => (
                  <button key={member.id} type="button" className="mb-3 block w-full text-left last:mb-0" onClick={() => setSelectedId(member.id)}>
                    <TableRow columns={5}>
                      <div>
                        <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">{member.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{member.email}</p>
                      </div>
                      <p className="text-sm text-[color:var(--muted)]">{member.role}</p>
                      <p className="text-sm text-[color:var(--muted)]">{member.access}</p>
                      <p className="text-sm text-[color:var(--muted)]">{formatDateTime(member.lastActiveAt ?? member.inviteSentAt)}</p>
                      <div><StatusBadge value={member.status} /></div>
                    </TableRow>
                  </button>
                ))}
              </Table>
            </div>
          </div>
        </Card>

        <DarkCard
          title={selectedMember?.name ?? "Member profile"}
          description={selectedMember?.email ?? "Select a member to manage role and access."}
        >
          {selectedMember ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <DarkField label="Role" value={selectedMember.role} />
                <DarkField
                  label="Status"
                  value={<StatusBadge value={selectedMember.status} />}
                />
                <DarkField label="Access" value={selectedMember.access} />
                <DarkField
                  label="Markets"
                  value={selectedMember.markets.join(", ") || "Global"}
                />
                <DarkField
                  label="Last active"
                  value={formatDateTime(selectedMember.lastActiveAt)}
                />
                <DarkField
                  label="Invite sent"
                  value={formatDateTime(selectedMember.inviteSentAt)}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Select
                  value={selectedMember.role}
                  className="border-white/12 bg-white/6 text-white focus:border-[#d9f6bc]"
                  onChange={(event) =>
                    void handleRoleChange(event.target.value as TeamRole)
                  }
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Select
                  value={selectedMember.status}
                  className="border-white/12 bg-white/6 text-white focus:border-[#d9f6bc]"
                  onChange={(event) =>
                    void handleStatusChange(
                      event.target.value as TeamMemberRecord["status"]
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  tone="darkBrand"
                  disabled={isBusy === "sync-role"}
                  onClick={() => void handleSyncRole()}
                >
                  Sync role
                </Button>
                {selectedMember.status === "invited" ? (
                  <>
                    <Button
                      tone="darkNeutral"
                      disabled={isBusy === "resend-invite"}
                      onClick={() => void handleResendInvite()}
                    >
                      Resend invite
                    </Button>
                    <Button
                      tone="darkDanger"
                      disabled={isBusy === "revoke-invite"}
                      onClick={() => void handleRevokeInvite()}
                    >
                      Revoke invite
                    </Button>
                  </>
                ) : null}
                {selectedMember.role !== "owner" ? (
                  <Button
                    tone="darkDanger"
                    disabled={isBusy === "delete-member"}
                    onClick={() => void handleDeleteMember()}
                  >
                    Remove member
                  </Button>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                  Permissions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedMember.permissions.map((permission) => (
                    <StatusBadge key={permission} value="active">
                      {permission.replace(/_/g, " ")}
                    </StatusBadge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-white/66">
              No team member matches the current filter.
            </p>
          )}
        </DarkCard>
      </div>
    </div>
  );
}
