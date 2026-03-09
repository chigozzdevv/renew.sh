"use client";

import { useEffect, useMemo, useState } from "react";

import { useWorkspaceMode } from "@/components/dashboard/mode-provider";
import { useDashboardSession } from "@/components/dashboard/session-provider";
import { useAuthedResource } from "@/components/dashboard/use-authed-resource";
import {
  Badge,
  Button,
  Card,
  DarkCard,
  Field,
  Input,
  MetricCard,
  PageState,
  Select,
  StatGrid,
} from "@/components/dashboard/ui";
import { ApiError } from "@/lib/api";
import {
  addTreasuryOwner,
  approveTreasuryOperation,
  bootstrapTreasuryAccount,
  createTreasurySignerChallenge,
  executeTreasuryOperation,
  getTreasuryOperationSigningPayload,
  loadTreasuryWorkspace,
  queueSettlementSweep,
  rejectTreasuryOperation,
  removeTreasuryOwner,
  type Settlement,
  type TeamMember,
  type TreasuryOperation,
  type TreasurySigner,
  updateTreasuryThreshold,
  verifyTreasurySigner,
} from "@/lib/treasury";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    ethereum?: {
      request: (input: {
        method: string;
        params?: unknown[] | Record<string, unknown>;
      }) => Promise<unknown>;
    };
  }
}

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function formatAddress(value: string) {
  const normalized = value.trim();

  if (normalized.length < 12) {
    return normalized;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatOperationLabel(kind: string) {
  const labels: Record<string, string> = {
    settlement_sweep: "Settlement sweep",
    payout_wallet_change_request: "Primary wallet change",
    payout_wallet_change_confirm: "Primary wallet confirm",
    reserve_wallet_update: "Reserve wallet update",
    reserve_wallet_clear: "Reserve wallet removal",
    reserve_wallet_promote: "Promote reserve wallet",
    safe_owner_add: "Add Safe owner",
    safe_owner_remove: "Remove Safe owner",
    safe_threshold_change: "Change Safe threshold",
  };

  return labels[kind] ?? kind.replace(/_/g, " ");
}

function formatOperationStatus(status: string) {
  const labels: Record<string, string> = {
    pending_signatures: "Pending signatures",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Executed",
  };

  return labels[status] ?? status;
}

function statusTone(status: string) {
  if (status === "approved" || status === "executed") {
    return "brand" as const;
  }

  if (status === "rejected" || status === "failed") {
    return "danger" as const;
  }

  if (status === "confirming") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

function getWalletProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("A browser wallet is required for treasury signing.");
  }

  return window.ethereum;
}

async function connectWallet(expectedWallet?: string) {
  const provider = getWalletProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  const walletAddress = normalizeAddress(accounts?.[0] ?? "");

  if (!walletAddress) {
    throw new Error("No wallet account is connected.");
  }

  if (
    expectedWallet &&
    normalizeAddress(expectedWallet) !== walletAddress
  ) {
    throw new Error(`Connect ${expectedWallet} to continue.`);
  }

  return {
    provider,
    walletAddress,
  };
}

type OwnerEntry = {
  walletAddress: string;
  signer: TreasurySigner | null;
  member: TeamMember | null;
};

export function TreasuryPageSurface() {
  const { token, user } = useDashboardSession();
  const { mode } = useWorkspaceMode();
  const { data, isLoading, error, reload } = useAuthedResource(
    async ({ token, merchantId }) =>
      loadTreasuryWorkspace({
        token,
        merchantId,
        environment: mode,
      }),
    [mode]
  );
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [ownerTeamMemberId, setOwnerTeamMemberId] = useState("");
  const [ownerThreshold, setOwnerThreshold] = useState("");
  const [thresholdDraft, setThresholdDraft] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [bootstrapMode, setBootstrapMode] = useState<"create" | "import">(
    "create"
  );
  const [bootstrapOwnerIds, setBootstrapOwnerIds] = useState<string[]>([]);
  const [bootstrapThreshold, setBootstrapThreshold] = useState("1");
  const [bootstrapSafeAddress, setBootstrapSafeAddress] = useState("");

  const treasury = data?.treasury ?? null;
  const account = treasury?.account ?? null;
  const operations = treasury?.operations ?? [];
  const signers = treasury?.signers ?? [];
  const teams = data?.teams ?? [];
  const settlements = data?.settlements ?? [];

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );
  const signerByTeamMemberId = useMemo(
    () => new Map(signers.map((signer) => [signer.teamMemberId, signer])),
    [signers]
  );
  const signerByWallet = useMemo(
    () =>
      new Map(signers.map((signer) => [normalizeAddress(signer.walletAddress), signer])),
    [signers]
  );

  const activeVerifiedMembers = useMemo(
    () =>
      teams.filter((team) => {
        const signer = signerByTeamMemberId.get(team.id);
        return team.status === "active" && signer?.status === "active";
      }),
    [signerByTeamMemberId, teams]
  );

  const ownerEntries = useMemo<OwnerEntry[]>(
    () =>
      account
        ? account.ownerAddresses.map((walletAddress) => {
            const signer = signerByWallet.get(normalizeAddress(walletAddress)) ?? null;
            const member = signer ? teamMap.get(signer.teamMemberId) ?? null : null;

            return {
              walletAddress,
              signer,
              member,
            };
          })
        : [],
    [account, signerByWallet, teamMap]
  );

  const eligibleOwners = useMemo(
    () =>
      activeVerifiedMembers.filter((team) => {
        const signer = signerByTeamMemberId.get(team.id);

        if (!signer) {
          return false;
        }

        if (!account) {
          return true;
        }

        return !account.ownerAddresses
          .map(normalizeAddress)
          .includes(normalizeAddress(signer.walletAddress));
      }),
    [account, activeVerifiedMembers, signerByTeamMemberId]
  );

  const currentSigner = user
    ? signers.find(
        (signer) =>
          signer.teamMemberId === user.teamMemberId && signer.status === "active"
      ) ?? null
    : null;

  const canCurrentUserApprove =
    !!account &&
    !!currentSigner &&
    account.ownerAddresses
      .map(normalizeAddress)
      .includes(normalizeAddress(currentSigner.walletAddress));

  const pendingOperations = operations.filter(
    (operation) =>
      operation.status === "pending_signatures" || operation.status === "approved"
  );
  const pendingSettlements = settlements.filter((settlement) => {
    if (settlement.status === "settled" || settlement.status === "reversed") {
      return false;
    }

    return !operations.some(
      (operation) =>
        operation.kind === "settlement_sweep" &&
        operation.settlementId === settlement.id &&
        operation.status !== "rejected"
    );
  });

  useEffect(() => {
    if (operations.length === 0) {
      setSelectedOperationId(null);
      return;
    }

    const hasCurrentSelection = operations.some(
      (operation) => operation.id === selectedOperationId
    );

    if (!hasCurrentSelection) {
      setSelectedOperationId(operations[0].id);
    }
  }, [operations, selectedOperationId]);

  useEffect(() => {
    if (account) {
      setThresholdDraft(String(account.threshold));
      setOwnerThreshold(String(account.threshold));
    }
  }, [account?.threshold]);

  useEffect(() => {
    if (!account && bootstrapOwnerIds.length === 0 && currentSigner) {
      setBootstrapOwnerIds([currentSigner.teamMemberId]);
      setBootstrapThreshold("1");
    }
  }, [account, bootstrapOwnerIds.length, currentSigner]);

  useEffect(() => {
    if (!ownerTeamMemberId && eligibleOwners.length > 0) {
      setOwnerTeamMemberId(eligibleOwners[0].id);
    }
  }, [eligibleOwners, ownerTeamMemberId]);

  const selectedOperation =
    operations.find((operation) => operation.id === selectedOperationId) ??
    operations[0] ??
    null;

  async function runMutation(
    task: () => Promise<void>,
    successMessage: string
  ) {
    setActionError(null);
    setActionMessage(null);
    setIsMutating(true);

    try {
      await task();
      setActionMessage(successMessage);
      await reload();
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleBindSigner() {
    if (!token || !user) {
      return;
    }

    await runMutation(async () => {
      const { provider, walletAddress } = await connectWallet();
      const challenge = await createTreasurySignerChallenge({
        token,
        merchantId: user.merchantId,
        walletAddress,
      });
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.challengeMessage, walletAddress],
      })) as string;

      await verifyTreasurySigner({
        token,
        merchantId: user.merchantId,
        signature,
      });
    }, "Signer wallet linked.");
  }

  async function handleBootstrap() {
    if (!token || !user) {
      return;
    }

    await runMutation(async () => {
      if (bootstrapMode === "create") {
        if (bootstrapOwnerIds.length === 0) {
          throw new Error("Select at least one verified signer to create the Safe.");
        }

        await bootstrapTreasuryAccount({
          token,
          merchantId: user.merchantId,
          environment: mode,
          payload: {
            mode: "create",
            ownerTeamMemberIds: bootstrapOwnerIds,
            threshold: Number(bootstrapThreshold),
          },
        });
        return;
      }

      if (!bootstrapSafeAddress.trim()) {
        throw new Error("Enter the Safe address to import.");
      }

      await bootstrapTreasuryAccount({
        token,
        merchantId: user.merchantId,
        environment: mode,
        payload: {
          mode: "import",
          safeAddress: bootstrapSafeAddress.trim(),
        },
      });
    }, "Treasury Safe configured.");
  }

  async function handleApproveOperation(operationId: string) {
    if (!token || !currentSigner) {
      return;
    }

    await runMutation(async () => {
      const { provider, walletAddress } = await connectWallet(
        currentSigner.walletAddress
      );
      const payload = await getTreasuryOperationSigningPayload({
        token,
        operationId,
      });
      const signature = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [walletAddress, JSON.stringify(payload.signingPayload.typedData)],
      })) as string;

      await approveTreasuryOperation({
        token,
        operationId,
        signature,
      });
    }, "Treasury operation approved.");
  }

  async function handleRejectOperation(operationId: string) {
    if (!token || !rejectReason.trim()) {
      return;
    }

    await runMutation(async () => {
      await rejectTreasuryOperation({
        token,
        operationId,
        reason: rejectReason.trim(),
      });
      setRejectReason("");
    }, "Treasury operation rejected.");
  }

  async function handleExecuteOperation(operationId: string) {
    if (!token) {
      return;
    }

    await runMutation(async () => {
      await executeTreasuryOperation({
        token,
        operationId,
      });
    }, "Treasury operation submitted.");
  }

  async function handleAddOwner() {
    if (!token || !user || !ownerTeamMemberId) {
      return;
    }

    await runMutation(async () => {
      await addTreasuryOwner({
        token,
        merchantId: user.merchantId,
        environment: mode,
        teamMemberId: ownerTeamMemberId,
        threshold: ownerThreshold ? Number(ownerThreshold) : undefined,
      });
    }, "Treasury owner change queued.");
  }

  async function handleRemoveOwner(teamMemberId: string) {
    if (!token || !user) {
      return;
    }

    await runMutation(async () => {
      await removeTreasuryOwner({
        token,
        merchantId: user.merchantId,
        environment: mode,
        teamMemberId,
      });
    }, "Treasury owner removal queued.");
  }

  async function handleThresholdChange() {
    if (!token || !user || !thresholdDraft) {
      return;
    }

    await runMutation(async () => {
      await updateTreasuryThreshold({
        token,
        merchantId: user.merchantId,
        environment: mode,
        threshold: Number(thresholdDraft),
      });
    }, "Treasury threshold change queued.");
  }

  async function handleQueueSweep(settlement: Settlement) {
    if (!token || !user) {
      return;
    }

    await runMutation(async () => {
      await queueSettlementSweep({
        token,
        merchantId: user.merchantId,
        environment: mode,
        settlementId: settlement.id,
      });
    }, `Settlement ${settlement.batchRef} queued for treasury approval.`);
  }

  if (isLoading) {
    return (
      <PageState
        title="Loading treasury"
        message="Fetching Safe custody, signer bindings, and pending treasury operations."
      />
    );
  }

  if (error) {
    return (
      <PageState
        title="Treasury unavailable"
        message={error}
        tone="danger"
        action={
          <Button type="button" onClick={() => void reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="space-y-6">
      {actionError ? (
        <PageState title="Treasury action failed" message={actionError} tone="danger" />
      ) : null}
      {actionMessage ? (
        <PageState title="Treasury updated" message={actionMessage} />
      ) : null}

      <StatGrid>
        <MetricCard
          label="Safe owners"
          value={String(account?.ownerAddresses.length ?? 0)}
          note="Bound treasury approvers"
          tone="brand"
        />
        <MetricCard
          label="Threshold"
          value={account ? `${account.threshold}` : "Not set"}
          note="Required Safe approvals"
        />
        <MetricCard
          label="Pending approvals"
          value={String(pendingOperations.length)}
          note="Waiting on treasury signatures"
        />
        <MetricCard
          label="Awaiting sweep"
          value={String(pendingSettlements.length)}
          note="Settlements ready for treasury review"
        />
      </StatGrid>

      {!account ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card
            title="Link signer wallet"
            description="Treasury approvers keep platform login for the dashboard, then bind a wallet only for Safe approvals."
            action={
              <Button
                type="button"
                tone="brand"
                disabled={isMutating}
                onClick={() => void handleBindSigner()}
              >
                {currentSigner ? "Re-verify wallet" : "Bind wallet"}
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Current signer"
                value={currentSigner ? formatAddress(currentSigner.walletAddress) : "Not linked"}
              />
              <Field
                label="Status"
                value={
                  <Badge tone={currentSigner ? "brand" : "warning"}>
                    {currentSigner ? "Verified" : "Needs wallet"}
                  </Badge>
                }
              />
            </div>
          </Card>

          <Card title="Configure treasury Safe" description="Create a new merchant Safe or import the existing treasury Safe on Avalanche.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["create", "import"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBootstrapMode(mode)}
                    className={cn(
                      "rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200",
                      bootstrapMode === mode
                        ? "bg-[#0c4a27] text-[#d9f6bc]"
                        : "border border-[color:var(--line)] bg-white text-[color:var(--muted)] hover:bg-[#f7fbf5]"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {bootstrapMode === "create" ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Verified owners
                    </p>
                    <div className="grid gap-2">
                      {activeVerifiedMembers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[#f8faf7] px-4 py-4 text-sm text-[color:var(--muted)]">
                          Link at least one treasury signer wallet before creating the Safe.
                        </div>
                      ) : (
                        activeVerifiedMembers.map((member) => {
                          const signer = signerByTeamMemberId.get(member.id);
                          const isSelected = bootstrapOwnerIds.includes(member.id);

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() =>
                                setBootstrapOwnerIds((current) =>
                                  isSelected
                                    ? current.filter((entry) => entry !== member.id)
                                    : [...current, member.id]
                                )
                              }
                              className={cn(
                                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-200",
                                isSelected
                                  ? "border-[#0c4a27]/18 bg-[#edf7eb]"
                                  : "border-[color:var(--line)] bg-white hover:bg-[#f7fbf5]"
                              )}
                            >
                              <span>
                                <span className="block text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                                  {member.name}
                                </span>
                                <span className="mt-1 block text-xs text-[color:var(--muted)]">
                                  {member.role} • {formatAddress(signer?.walletAddress ?? "")}
                                </span>
                              </span>
                              <Badge tone={isSelected ? "brand" : "neutral"}>
                                {isSelected ? "Selected" : "Available"}
                              </Badge>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="max-w-[12rem]">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Threshold
                    </p>
                    <Select
                      value={bootstrapThreshold}
                      onChange={(event) => setBootstrapThreshold(event.target.value)}
                    >
                      {Array.from(
                        { length: Math.max(bootstrapOwnerIds.length, 1) },
                        (_, index) => index + 1
                      ).map((value) => (
                        <option key={value} value={String(value)}>
                          {value} approval{value > 1 ? "s" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Existing Safe
                  </p>
                  <Input
                    value={bootstrapSafeAddress}
                    onChange={(event) => setBootstrapSafeAddress(event.target.value)}
                    placeholder="0x..."
                  />
                </div>
              )}

              <Button
                type="button"
                tone="brand"
                disabled={isMutating}
                onClick={() => void handleBootstrap()}
              >
                {bootstrapMode === "create" ? "Create Safe" : "Import Safe"}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <Card title="Treasury operations" description="Live Safe-governed operations waiting for approvals or execution.">
              {operations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[#f8faf7] px-5 py-8 text-sm text-[color:var(--muted)]">
                  No treasury operations are open right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {operations.map((operation) => (
                    <button
                      key={operation.id}
                      type="button"
                      onClick={() => setSelectedOperationId(operation.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200",
                        selectedOperation?.id === operation.id
                          ? "border-[#0c4a27]/14 bg-[#edf7eb]"
                          : "border-[color:var(--line)] bg-white hover:bg-[#f7fbf5]"
                      )}
                    >
                      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                            {formatOperationLabel(operation.kind)}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--muted)]">
                            {operation.metadata.teamMemberName
                              ? String(operation.metadata.teamMemberName)
                              : operation.kind === "settlement_sweep" && operation.metadata.batchRef
                                ? `Batch ${String(operation.metadata.batchRef)}`
                                : operation.origin}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
                          <Badge tone={statusTone(operation.status)}>
                            {formatOperationStatus(operation.status)}
                          </Badge>
                          <Badge>
                            {operation.approvedCount}/{operation.threshold}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <DarkCard
              title={
                selectedOperation
                  ? formatOperationLabel(selectedOperation.kind)
                  : "Operation details"
              }
              description={
                selectedOperation
                  ? `Opened ${formatDateTime(selectedOperation.createdAt)}`
                  : "Select an operation to review Safe approvals and execution state."
              }
            >
              {selectedOperation ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(selectedOperation.status)}>
                      {formatOperationStatus(selectedOperation.status)}
                    </Badge>
                    <Badge tone="neutral">
                      {selectedOperation.approvedCount}/{selectedOperation.threshold} approvals
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DarkField
                      label="Safe"
                      value={formatAddress(selectedOperation.safeAddress)}
                    />
                    <DarkField
                      label="Target"
                      value={formatAddress(selectedOperation.targetAddress)}
                    />
                    <DarkField
                      label="Safe tx"
                      value={selectedOperation.safeTxHash ?? "Prepared on demand"}
                    />
                    <DarkField
                      label="Execution"
                      value={selectedOperation.txHash ?? "Waiting"}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
                      Approvals
                    </p>
                    <div className="mt-3 space-y-3">
                      {selectedOperation.signatures.length === 0 ? (
                        <p className="text-sm text-white/66">
                          No approvals collected yet.
                        </p>
                      ) : (
                        selectedOperation.signatures.map((signature) => (
                          <div
                            key={`${selectedOperation.id}:${signature.teamMemberId}`}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {signature.name}
                              </p>
                              <p className="mt-1 text-xs text-white/60">
                                {signature.role} • {formatDateTime(signature.signedAt)}
                              </p>
                            </div>
                            <span className="text-xs text-white/62">
                              {formatAddress(signature.walletAddress)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Reason for rejection"
                      className="border-white/12 bg-white/6 text-white placeholder:text-white/40"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        tone="brand"
                        className="border-white/0 bg-[#d9f6bc] text-[#0c4a27]"
                        disabled={
                          isMutating ||
                          !canCurrentUserApprove ||
                          selectedOperation.signatures.some(
                            (signature) => signature.teamMemberId === user?.teamMemberId
                          ) ||
                          selectedOperation.status === "rejected" ||
                          selectedOperation.status === "executed"
                        }
                        onClick={() => void handleApproveOperation(selectedOperation.id)}
                      >
                        {canCurrentUserApprove ? "Approve with wallet" : "Owner wallet required"}
                      </Button>
                      <Button
                        type="button"
                        className="border-white/12 bg-white/6 text-white"
                        disabled={
                          isMutating ||
                          selectedOperation.status === "rejected" ||
                          selectedOperation.status === "executed" ||
                          rejectReason.trim().length < 2
                        }
                        onClick={() => void handleRejectOperation(selectedOperation.id)}
                      >
                        Reject
                      </Button>
                    </div>
                    <Button
                      type="button"
                      className="w-full border-white/12 bg-white/6 text-white"
                      disabled={isMutating || !selectedOperation.canExecute}
                      onClick={() => void handleExecuteOperation(selectedOperation.id)}
                    >
                      Execute sponsored transaction
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/6 px-5 py-10 text-center text-sm text-white/66">
                  Select an operation to review approval state.
                </div>
              )}
            </DarkCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card
              title="Safe ownership"
              description="Owners sign treasury operations off-chain and one executor relays the approved Safe transaction."
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Safe address" value={formatAddress(account.safeAddress)} />
                  <Field label="Gas policy" value={account.gasPolicy} />
                  <Field
                    label="Primary wallet"
                    value={formatAddress(account.payoutWallet)}
                  />
                  <Field
                    label="Reserve wallet"
                    value={
                      account.reserveWallet
                        ? formatAddress(account.reserveWallet)
                        : "Not configured"
                    }
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    Current owners
                  </p>
                  <div className="max-h-[20rem] space-y-3 overflow-y-auto pr-1">
                    {ownerEntries.map((owner) => (
                      <div
                        key={owner.walletAddress}
                        className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                              {owner.member?.name ?? "Unmapped owner"}
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">
                              {owner.member?.email ?? owner.walletAddress}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                              {formatAddress(owner.walletAddress)}
                            </p>
                          </div>
                          {owner.member?.id ? (
                            <Button
                              type="button"
                              disabled={
                                isMutating || ownerEntries.length < 2 || !["owner", "admin"].includes(user?.role ?? "")
                              }
                              onClick={() => void handleRemoveOwner(owner.member!.id)}
                            >
                              Remove owner
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 border-t border-[color:var(--line)] pt-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Add owner
                    </p>
                    <Select
                      value={ownerTeamMemberId}
                      onChange={(event) => setOwnerTeamMemberId(event.target.value)}
                    >
                      <option value="">Select verified signer</option>
                      {eligibleOwners.map((member) => {
                        const signer = signerByTeamMemberId.get(member.id);
                        return (
                          <option key={member.id} value={member.id}>
                            {member.name} • {member.role} • {formatAddress(signer?.walletAddress ?? "")}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Next threshold
                    </p>
                    <Select
                      value={ownerThreshold}
                      onChange={(event) => setOwnerThreshold(event.target.value)}
                    >
                      {Array.from(
                        { length: Math.max(account.ownerAddresses.length + 1, 1) },
                        (_, index) => index + 1
                      ).map((value) => (
                        <option key={value} value={String(value)}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                      Signature threshold
                    </p>
                    <Select
                      value={thresholdDraft}
                      onChange={(event) => setThresholdDraft(event.target.value)}
                    >
                      {Array.from(
                        { length: Math.max(account.ownerAddresses.length, 1) },
                        (_, index) => index + 1
                      ).map((value) => (
                        <option key={value} value={String(value)}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-end gap-3">
                    <Button
                      type="button"
                      disabled={
                        isMutating ||
                        !ownerTeamMemberId ||
                        !["owner", "admin"].includes(user?.role ?? "")
                      }
                      onClick={() => void handleAddOwner()}
                    >
                      Queue owner add
                    </Button>
                    <Button
                      type="button"
                      tone="brand"
                      disabled={
                        isMutating ||
                        !thresholdDraft ||
                        Number(thresholdDraft) === account.threshold ||
                        !["owner", "admin"].includes(user?.role ?? "")
                      }
                      onClick={() => void handleThresholdChange()}
                    >
                      Queue threshold
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card
                title="Signer binding"
                description="Bind the wallet you use to sign Safe approvals. App auth stays on Renew."
                action={
                  <Button
                    type="button"
                    tone="brand"
                    disabled={isMutating}
                    onClick={() => void handleBindSigner()}
                  >
                    {currentSigner ? "Re-verify wallet" : "Bind wallet"}
                  </Button>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Current wallet"
                    value={
                      currentSigner
                        ? formatAddress(currentSigner.walletAddress)
                        : "No wallet linked"
                    }
                  />
                  <Field
                    label="Approval access"
                    value={
                      <Badge tone={canCurrentUserApprove ? "brand" : "warning"}>
                        {canCurrentUserApprove ? "Can approve" : "Not a Safe owner"}
                      </Badge>
                    }
                  />
                  <Field
                    label="Signer status"
                    value={
                      <Badge tone={currentSigner ? "brand" : "neutral"}>
                        {currentSigner ? "Verified" : "Pending"}
                      </Badge>
                    }
                  />
                  <Field
                    label="Last approval"
                    value={currentSigner ? formatDateTime(currentSigner.lastApprovedAt) : "None"}
                  />
                </div>
              </Card>

              <Card
                title="Settlements awaiting sweep"
                description="Queue real settlement batches into the Safe approval flow."
              >
                {pendingSettlements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[#f8faf7] px-4 py-6 text-sm text-[color:var(--muted)]">
                    No unswept settlements are waiting right now.
                  </div>
                ) : (
                  <div className="max-h-[18rem] space-y-3 overflow-y-auto pr-1">
                    {pendingSettlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
                              Batch {settlement.batchRef}
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">
                              {settlement.netUsdc.toFixed(2)} USDC • {formatDate(settlement.scheduledFor)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge tone={statusTone(settlement.status)}>
                              {settlement.status}
                            </Badge>
                            <Button
                              type="button"
                              disabled={isMutating}
                              onClick={() => void handleQueueSweep(settlement)}
                            >
                              Queue sweep
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DarkField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/46">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-white">
        {value}
      </p>
    </div>
  );
}
