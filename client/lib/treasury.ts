"use client";

import { fetchApi } from "@/lib/api";

export type TreasuryAccount = {
  id: string;
  merchantId: string;
  custodyModel: string;
  safeAddress: string;
  payoutWallet: string;
  reserveWallet: string | null;
  ownerAddresses: string[];
  threshold: number;
  chainId: number;
  txServiceUrl: string;
  gasPolicy: string;
  status: string;
  pendingPayoutWallet: string | null;
  payoutWalletChangeReadyAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TreasurySigner = {
  id: string;
  merchantId: string;
  teamMemberId: string;
  walletAddress: string;
  status: string;
  challengeMessage: string | null;
  challengeIssuedAt: string | null;
  verifiedAt: string | null;
  revokedAt: string | null;
  lastApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TreasuryOperationSignature = {
  teamMemberId: string;
  name: string;
  email: string;
  role: string;
  walletAddress: string;
  signedAt: string;
};

export type TreasuryOperation = {
  id: string;
  merchantId: string;
  treasuryAccountId: string;
  settlementId: string | null;
  kind: string;
  status: string;
  safeAddress: string;
  safeTxHash: string | null;
  safeNonce: number | null;
  threshold: number;
  approvedCount: number;
  canExecute: boolean;
  targetAddress: string;
  value: string;
  data: string;
  origin: string;
  createdBy: string;
  signatures: TreasuryOperationSignature[];
  txHash: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
  executedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TreasuryOverview = {
  account: TreasuryAccount | null;
  signers: TreasurySigner[];
  operations: TreasuryOperation[];
};

export type TeamMember = {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  markets: string[];
  permissions: string[];
  access: string;
  lastActiveAt: string | null;
  inviteSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settlement = {
  id: string;
  merchantId: string;
  sourceChargeId: string | null;
  batchRef: string;
  grossUsdc: number;
  feeUsdc: number;
  netUsdc: number;
  destinationWallet: string;
  status: string;
  txHash: string | null;
  submittedAt: string | null;
  scheduledFor: string;
  settledAt: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TreasuryWorkspace = {
  treasury: TreasuryOverview;
  teams: TeamMember[];
  settlements: Settlement[];
};

export type TreasurySigningPayload = {
  operation: TreasuryOperation;
  signingPayload: {
    safeAddress: string;
    safeTxHash: string;
    safeNonce: number;
    typedData: unknown;
  };
};

export async function loadTreasuryWorkspace(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
}) {
  const [treasury, teams, settlements] = await Promise.all([
    fetchApi<TreasuryOverview>(`/treasury/${input.merchantId}`, {
      token: input.token,
      query: {
        environment: input.environment,
      },
    }),
    fetchApi<TeamMember[]>("/teams", {
      token: input.token,
      query: { merchantId: input.merchantId },
    }),
    fetchApi<Settlement[]>("/settlements", {
      token: input.token,
      query: {
        merchantId: input.merchantId,
        environment: input.environment,
      },
    }),
  ]);

  return {
    treasury: treasury.data,
    teams: teams.data,
    settlements: settlements.data,
  } satisfies TreasuryWorkspace;
}

export async function createTreasurySignerChallenge(input: {
  token: string;
  merchantId: string;
  walletAddress: string;
}) {
  const response = await fetchApi<{
    signer: TreasurySigner;
    challengeMessage: string;
  }>(`/treasury/${input.merchantId}/signers/challenge`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      walletAddress: input.walletAddress,
    }),
  });

  return response.data;
}

export async function verifyTreasurySigner(input: {
  token: string;
  merchantId: string;
  signature: string;
}) {
  const response = await fetchApi<TreasurySigner>(
    `/treasury/${input.merchantId}/signers/verify`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        signature: input.signature,
      }),
    }
  );

  return response.data;
}

export async function bootstrapTreasuryAccount(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  payload:
    | {
        mode: "create";
        ownerTeamMemberIds: string[];
        threshold?: number;
      }
    | {
        mode: "import";
        safeAddress: string;
      };
}) {
  const response = await fetchApi<TreasuryAccount>(
    `/treasury/${input.merchantId}/bootstrap`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        ...input.payload,
        environment: input.environment,
      }),
    }
  );

  return response.data;
}

export async function addTreasuryOwner(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  teamMemberId: string;
  threshold?: number;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/${input.merchantId}/owners`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        environment: input.environment,
        teamMemberId: input.teamMemberId,
        threshold: input.threshold,
      }),
    }
  );

  return response.data;
}

export async function removeTreasuryOwner(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  teamMemberId: string;
  threshold?: number;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/${input.merchantId}/owners/${input.teamMemberId}/remove`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        environment: input.environment,
        threshold: input.threshold,
      }),
    }
  );

  return response.data;
}

export async function updateTreasuryThreshold(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  threshold: number;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/${input.merchantId}/threshold`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        environment: input.environment,
        threshold: input.threshold,
      }),
    }
  );

  return response.data;
}

export async function getTreasuryOperationSigningPayload(input: {
  token: string;
  operationId: string;
}) {
  const response = await fetchApi<TreasurySigningPayload>(
    `/treasury/operations/${input.operationId}/signing-payload`,
    {
      token: input.token,
    }
  );

  return response.data;
}

export async function approveTreasuryOperation(input: {
  token: string;
  operationId: string;
  signature: string;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/operations/${input.operationId}/approve`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        signature: input.signature,
      }),
    }
  );

  return response.data;
}

export async function rejectTreasuryOperation(input: {
  token: string;
  operationId: string;
  reason: string;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/operations/${input.operationId}/reject`,
    {
      method: "POST",
      token: input.token,
      body: JSON.stringify({
        reason: input.reason,
      }),
    }
  );

  return response.data;
}

export async function executeTreasuryOperation(input: {
  token: string;
  operationId: string;
}) {
  const response = await fetchApi<TreasuryOperation>(
    `/treasury/operations/${input.operationId}/execute`,
    {
      method: "POST",
      token: input.token,
    }
  );

  return response.data;
}

export async function queueSettlementSweep(input: {
  token: string;
  merchantId: string;
  environment: "test" | "live";
  settlementId: string;
}) {
  const response = await fetchApi<{
    queued: boolean;
    processedInline: boolean;
    settlementId: string;
    awaitingApproval?: boolean;
    approval?: TreasuryOperation;
    result?: TreasuryOperation | Record<string, unknown>;
  }>(`/settlements/${input.settlementId}/queue-sweep`, {
    method: "POST",
    token: input.token,
    body: JSON.stringify({
      merchantId: input.merchantId,
      environment: input.environment,
    }),
  });

  return response.data;
}
