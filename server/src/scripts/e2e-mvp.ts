import { randomBytes, randomUUID } from "crypto";

import {
  createPublicClient,
  encodeFunctionData,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getCctpConfig } from "@/config/cctp.config";
import { env } from "@/config/env.config";
import { connectToDatabase, disconnectFromDatabase } from "@/config/db.config";
import { ChargeModel } from "@/features/charges/charge.model";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettlementModel } from "@/features/settlements/settlement.model";
import { TeamMemberModel } from "@/features/teams/team.model";
import { createSafeProvider } from "@/features/treasury/providers/safe/safe.factory";
import { createPasswordHash } from "@/shared/utils/password-hash";
import { getPermissionsForRole } from "@/shared/constants/team-rbac";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SIX_DECIMAL_SCALE = 1_000_000n;
const encodeContractCall = encodeFunctionData as (input: unknown) => Hex;

const renewProtocolAdminAbi = parseAbi([
  "function registerMerchant(address payoutWallet,address reserveWallet,bytes32 metadataHash)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type ApiRequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type SeedWorkspaceResult = {
  merchantId: string;
  teamMemberId: string;
  email: string;
  password: string;
  ownerPrivateKey: Hex;
  ownerWalletAddress: string;
  payoutWalletAddress: string;
  reserveWalletAddress: string;
};

type SubscriptionChargeResult = {
  chargeId: string;
  externalChargeId: string;
  settlementId: string;
  collectionStatus: string;
  settlementStatus: string;
};

function generateEphemeralPrivateKey(): Hex {
  return `0x${randomBytes(32).toString("hex")}` as Hex;
}

function getBaseUrl() {
  const port = process.env.PORT ?? String(env.PORT);
  return process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
}

function getE2EPlanUsdAmount() {
  const raw = process.env.E2E_PLAN_USD_AMOUNT?.trim() || "25";
  const amount = Number(raw);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      `E2E_PLAN_USD_AMOUNT must be a positive number, received "${raw}".`
    );
  }

  return amount;
}

function getRequiredTestValue(label: string, value: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required for the MVP smoke run.`);
  }

  return value.trim();
}

function assertTestnetPrerequisites() {
  if (env.PAYMENT_ENV !== "test" || env.AVALANCHE_ENV !== "test") {
    throw new Error(
      "The MVP smoke run must use test mode. Set PAYMENT_ENV=test and AVALANCHE_ENV=test."
    );
  }

  if (
    env.RENEW_PROTOCOL_ADDRESS_TEST === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "RENEW_PROTOCOL_ADDRESS_TEST is not deployed yet. Deploy the contracts on Fuji before running the smoke test."
    );
  }

  if (
    env.RENEW_VAULT_ADDRESS_TEST === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "RENEW_VAULT_ADDRESS_TEST is not deployed yet. Deploy the contracts on Fuji before running the smoke test."
    );
  }

  getRequiredTestValue(
    "SAFE_EXECUTOR_PRIVATE_KEY_TEST",
    env.SAFE_EXECUTOR_PRIVATE_KEY_TEST
  );
  getCctpConfig("test").assertConfigured();
  getRequiredTestValue("SAFE_TX_SERVICE_URL_TEST", env.SAFE_TX_SERVICE_URL_TEST);
  getRequiredTestValue("AVALANCHE_RPC_URL_TEST", env.AVALANCHE_RPC_URL_TEST);
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token
        ? {
            authorization: `Bearer ${options.token}`,
          }
        : {}),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { success?: boolean; message?: string; error?: unknown }
    | null;

  if (
    !response.ok ||
    !payload ||
    payload.success !== true ||
    !("data" in payload)
  ) {
    const detail =
      payload && typeof payload === "object"
        ? JSON.stringify(payload, null, 2)
        : response.statusText;

    throw new Error(
      `Request failed: ${options.method ?? "GET"} ${path} (${response.status})\n${detail}`
    );
  }

  return payload as ApiEnvelope<T>;
}

async function seedWorkspace(): Promise<SeedWorkspaceResult> {
  const runId = Date.now().toString();
  const ownerPrivateKey = (
    process.env.E2E_TREASURY_OWNER_PRIVATE_KEY?.trim() ||
    generateEphemeralPrivateKey()
  ) as Hex;
  const payoutPrivateKey = generateEphemeralPrivateKey();
  const reservePrivateKey = generateEphemeralPrivateKey();
  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  const payoutAccount = privateKeyToAccount(payoutPrivateKey);
  const reserveAccount = privateKeyToAccount(reservePrivateKey);
  const password = `RenewMvp!${runId}`;

  const merchant = await MerchantModel.create({
    merchantAccount: ownerAccount.address.toLowerCase(),
    payoutWallet: payoutAccount.address.toLowerCase(),
    reserveWallet: reserveAccount.address.toLowerCase(),
    name: `Renew MVP ${runId}`,
    supportEmail: `support+${runId}@renew.sh`,
    billingTimezone: "UTC",
    supportedMarkets: ["ZMW", "NGN", "KES"],
    metadataHash: "0x0",
    status: "active",
  });

  const passwordHash = createPasswordHash(
    password,
    env.PLATFORM_AUTH_PASSWORD_ITERATIONS
  );

  const teamMember = await TeamMemberModel.create({
    merchantId: merchant._id,
    name: "MVP Owner",
    email: `owner+${runId}@renew.sh`,
    role: "owner",
    status: "active",
    markets: ["ZMW", "NGN", "KES"],
    permissions: getPermissionsForRole("owner"),
    lastActiveAt: null,
    inviteToken: null,
    inviteSentAt: null,
    passwordHash: passwordHash.hash,
    passwordSalt: passwordHash.salt,
    passwordUpdatedAt: new Date(),
  });

  return {
    merchantId: merchant._id.toString(),
    teamMemberId: teamMember._id.toString(),
    email: teamMember.email,
    password,
    ownerPrivateKey,
    ownerWalletAddress: ownerAccount.address.toLowerCase(),
    payoutWalletAddress: payoutAccount.address.toLowerCase(),
    reserveWalletAddress: reserveAccount.address.toLowerCase(),
  };
}

function getTestRpcUrl() {
  return getRequiredTestValue("AVALANCHE_RPC_URL_TEST", env.AVALANCHE_RPC_URL_TEST);
}

function getExecutorPrivateKey() {
  return getRequiredTestValue(
    "SAFE_EXECUTOR_PRIVATE_KEY_TEST",
    env.SAFE_EXECUTOR_PRIVATE_KEY_TEST
  ) as Hex;
}

function getProtocolAddress() {
  return getRequiredTestValue(
    "RENEW_PROTOCOL_ADDRESS_TEST",
    env.RENEW_PROTOCOL_ADDRESS_TEST
  ) as Address;
}

function toUsdcBaseUnits(amount: bigint) {
  return amount * SIX_DECIMAL_SCALE;
}

async function waitForSettledState(input: {
  token: string;
  settlementId: string;
  chargeId: string;
  treasuryTxHash: Hex;
}) {
  const publicClient = createPublicClient({
    transport: http(getTestRpcUrl()),
  });

  await publicClient.waitForTransactionReceipt({
    hash: input.treasuryTxHash,
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const [settlement, charge] = await Promise.all([
      apiRequest<{ id: string; status: string; txHash: string | null }>(
        `/v1/settlements/${input.settlementId}?environment=test`,
        {
          method: "GET",
          token: input.token,
        }
      ),
      apiRequest<{ id: string; status: string; failureCode: string | null }>(
        `/v1/charges/${input.chargeId}?environment=test`,
        {
          method: "GET",
          token: input.token,
        }
      ),
    ]);

    if (
      settlement.data.status === "settled" &&
      charge.data.status === "settled"
    ) {
      return {
        settlement: settlement.data,
        charge: charge.data,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for the final settled state.");
}

async function waitForSettlementBridgeReady(input: {
  token: string;
  settlementId: string;
}) {
  const cctpConfig = getCctpConfig("test");
  const startedAt = Date.now();
  let lastSeenStatus = "queued";
  let lastProgressSnapshot = "";

  while (
    Date.now() - startedAt <
    cctpConfig.attestationTimeoutMs + 120_000
  ) {
    const settlement = await apiRequest<{
      id: string;
      status: string;
      txHash: string | null;
      bridgeSourceTxHash: string | null;
      bridgeReceiveTxHash: string | null;
      creditTxHash: string | null;
    }>(`/v1/settlements/${input.settlementId}?environment=test`, {
      method: "GET",
      token: input.token,
    });
    lastSeenStatus = settlement.data.status;
    const progressSnapshot = JSON.stringify({
      status: settlement.data.status,
      bridgeSourceTxHash: settlement.data.bridgeSourceTxHash,
      bridgeReceiveTxHash: settlement.data.bridgeReceiveTxHash,
      creditTxHash: settlement.data.creditTxHash,
    });

    if (progressSnapshot !== lastProgressSnapshot) {
      console.log(
        `11b. Settlement bridge progress ${JSON.stringify({
          settlementId: settlement.data.id,
          status: settlement.data.status,
          bridgeSourceTxHash: settlement.data.bridgeSourceTxHash,
          bridgeReceiveTxHash: settlement.data.bridgeReceiveTxHash,
          creditTxHash: settlement.data.creditTxHash,
          elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
        })}`
      );
      lastProgressSnapshot = progressSnapshot;
    }

    if (
      settlement.data.status === "confirming" &&
      settlement.data.bridgeSourceTxHash &&
      settlement.data.bridgeReceiveTxHash &&
      settlement.data.creditTxHash
    ) {
      return settlement.data;
    }

    if (settlement.data.status === "failed" || settlement.data.status === "reversed") {
      throw new Error(
        `Settlement bridge moved into ${settlement.data.status} before sweep execution.`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    `Timed out waiting for settlement bridge confirmation state (last status: ${lastSeenStatus}).`
  );
}

async function waitForQueuedChargeResult(input: {
  merchantId: string;
  subscriptionId: string;
  environment: "test" | "live";
}) {
  await connectToDatabase();

  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const charge = await ChargeModel.findOne({
        merchantId: input.merchantId,
        subscriptionId: input.subscriptionId,
        environment: input.environment,
      })
        .sort({ createdAt: -1 })
        .exec();

      if (charge) {
        const settlement = await SettlementModel.findOne({
          merchantId: input.merchantId,
          sourceChargeId: charge._id,
          environment: input.environment,
        })
          .sort({ createdAt: -1 })
          .exec();

        if (settlement) {
          return {
            chargeId: charge._id.toString(),
            externalChargeId: charge.externalChargeId,
            settlementId: settlement._id.toString(),
            collectionStatus: charge.status,
            settlementStatus: settlement.status,
          } satisfies SubscriptionChargeResult;
        }

        if (charge.status === "failed") {
          throw new Error(
            `Subscription charge failed before settlement creation (${charge.failureCode ?? "unknown_failure"}).`
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    await disconnectFromDatabase();
  }

  throw new Error("Timed out waiting for the queued charge and settlement.");
}

async function executeSafeCall(input: {
  safeAddress: string;
  ownerPrivateKey: Hex;
  targetAddress: Address;
  data: Hex;
  value?: string;
  origin: string;
}) {
  const ownerAccount = privateKeyToAccount(input.ownerPrivateKey);
  const safeProvider = createSafeProvider("test");
  const transactions = [
    {
      to: input.targetAddress,
      value: input.value ?? "0",
      data: input.data,
    },
  ];
  const signingPayload = await safeProvider.buildTransactionSigningPayload({
    safeAddress: input.safeAddress,
    targetAddress: input.targetAddress,
    data: input.data,
    value: input.value ?? "0",
  });

  const typedData = signingPayload.typedData as {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  const signTypedData = ownerAccount.signTypedData as (
    payload: unknown
  ) => Promise<Hex>;
  const ownerSignature = await signTypedData({
    domain: typedData.domain as never,
    types: typedData.types as never,
    primaryType: typedData.primaryType as never,
    message: typedData.message as never,
  });

  await safeProvider.proposeTransaction({
    safeAddress: input.safeAddress,
    transactions,
    senderAddress: ownerAccount.address,
    senderSignature: ownerSignature,
    origin: input.origin,
    safeNonce: signingPayload.safeNonce,
  });

  return safeProvider.executeTransaction({
    safeAddress: input.safeAddress,
    safeTxHash: signingPayload.safeTxHash,
    transactions,
    safeNonce: signingPayload.safeNonce,
    signatures: [
      {
        signer: ownerAccount.address,
        signature: ownerSignature,
      },
    ],
  });
}

async function assertLiquidityFunding(requiredSourceUsdc: number) {
  const cctpConfig = getCctpConfig("test").assertConfigured();
  const sourceAccount = privateKeyToAccount(cctpConfig.sourcePrivateKey as Hex);
  const avalancheAccount = privateKeyToAccount(getExecutorPrivateKey());
  const sourceClient = createPublicClient({
    transport: http(cctpConfig.sourceRpcUrl),
  });
  const avalancheClient = createPublicClient({
    transport: http(getTestRpcUrl()),
  });

  const [sourceGas, sourceUsdc, avalancheGas] = await Promise.all([
    sourceClient.getBalance({ address: sourceAccount.address }),
    sourceClient.readContract({
      address: cctpConfig.sourceUsdcAddress as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [sourceAccount.address],
    }),
    avalancheClient.getBalance({ address: avalancheAccount.address }),
  ]);

  const fundingIssues: string[] = [];

  if (sourceGas === 0n) {
    fundingIssues.push(
      `Sepolia gas missing for ${sourceAccount.address}`
    );
  }

  if (sourceUsdc < BigInt(Math.ceil(requiredSourceUsdc * 1_000_000))) {
    fundingIssues.push(
      `Circle test USDC missing for ${sourceAccount.address} on ${cctpConfig.sourceUsdcAddress} (need about ${requiredSourceUsdc.toFixed(
        2
      )} USDC)`
    );
  }

  if (avalancheGas === 0n) {
    fundingIssues.push(
      `Fuji AVAX missing for ${avalancheAccount.address}`
    );
  }

  if (fundingIssues.length > 0) {
    throw new Error(
      `Funding is incomplete before the MVP smoke run:\n- ${fundingIssues.join("\n- ")}`
    );
  }
}

async function registerOnchainMerchant(input: {
  safeAddress: string;
  ownerPrivateKey: Hex;
  payoutWalletAddress: string;
  reserveWalletAddress: string;
}) {
  const protocolAddress = getProtocolAddress();

  await executeSafeCall({
    safeAddress: input.safeAddress,
    ownerPrivateKey: input.ownerPrivateKey,
    targetAddress: protocolAddress,
    data: encodeContractCall({
      abi: renewProtocolAdminAbi,
      functionName: "registerMerchant",
      args: [
        input.payoutWalletAddress as Address,
        input.reserveWalletAddress as Address,
        `0x${Buffer.from("renew-mvp-merchant".padEnd(32, "\0")).toString("hex")}` as Hex,
      ],
    }),
    origin: "e2e:register-merchant",
  });
}

async function main() {
  assertTestnetPrerequisites();
  const planUsdAmount = getE2EPlanUsdAmount();

  await connectToDatabase();

  const seeded = await seedWorkspace();
  await disconnectFromDatabase();

  const ownerAccount = privateKeyToAccount(seeded.ownerPrivateKey);

  console.log("1. Logging into the platform session.");
  const login = await apiRequest<{
    accessToken: string;
    user: {
      teamMemberId: string;
      merchantId: string;
      email: string;
    };
  }>("/v1/auth/login", {
    method: "POST",
    body: {
      merchantId: seeded.merchantId,
      email: seeded.email,
      password: seeded.password,
    },
  });
  const token = login.data.accessToken;

  console.log("2. Verifying the treasury signer wallet.");
  const signerChallenge = await apiRequest<{
    signer: { id: string; walletAddress: string };
    challengeMessage: string;
  }>(`/v1/treasury/${seeded.merchantId}/signers/challenge`, {
    method: "POST",
    token,
    body: {
      walletAddress: seeded.ownerWalletAddress,
    },
  });
  const signerChallengeSignature = await ownerAccount.signMessage({
    message: signerChallenge.data.challengeMessage,
  });
  await apiRequest(`/v1/treasury/${seeded.merchantId}/signers/verify`, {
    method: "POST",
    token,
    body: {
      signature: signerChallengeSignature,
    },
  });

  console.log("3. Bootstrapping the merchant treasury Safe on Fuji.");
  const treasury = await apiRequest<{
    id: string;
    safeAddress: string;
    threshold: number;
    payoutWallet: string;
  }>(`/v1/treasury/${seeded.merchantId}/bootstrap`, {
    method: "POST",
    token,
    body: {
      environment: "test",
      mode: "create",
      threshold: 1,
      ownerTeamMemberIds: [seeded.teamMemberId],
    },
  });

  console.log("4. Verifying bridge liquidity wallets.");
  await assertLiquidityFunding(planUsdAmount);

  console.log("5. Registering the merchant Safe on RenewProtocol.");
  await registerOnchainMerchant({
    safeAddress: treasury.data.safeAddress,
    ownerPrivateKey: seeded.ownerPrivateKey,
    payoutWalletAddress: seeded.payoutWalletAddress,
    reserveWalletAddress: seeded.reserveWalletAddress,
  });

  console.log("6. Syncing test payment rails.");
  const syncedChannels = await apiRequest<
    Array<{ externalId: string; country: string; currency: string }>
  >("/v1/payment-rails/channels/sync", {
    method: "POST",
    token,
    body: {
      environment: "test",
      country: "ZM",
    },
  });
  const syncedNetworks = await apiRequest<
    Array<{ externalId: string; country: string; name: string }>
  >("/v1/payment-rails/networks/sync", {
    method: "POST",
    token,
    body: {
      environment: "test",
      country: "ZM",
    },
  });

  const channel = syncedChannels.data.find(
    (entry) => entry.currency === "ZMW" && entry.country === "ZM"
  );
  const network = syncedNetworks.data.find((entry) => entry.country === "ZM");

  if (!channel || !network) {
    throw new Error("Payment rail sync did not return the expected ZMW channel/network.");
  }

  console.log("7. Creating a sandbox plan.");
  const plan = await apiRequest<{ id: string; name: string }>("/v1/plans", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      environment: "test",
      planCode: `MVP-${Date.now()}`,
      name: "Core Pro",
      usdAmount: planUsdAmount,
      billingIntervalDays: 30,
      trialDays: 0,
      retryWindowHours: 24,
      billingMode: "fixed",
      supportedMarkets: ["ZMW"],
      status: "active",
    },
  });

  console.log("8. Creating a sandbox server key and checkout session.");
  const developerKey = await apiRequest<{
    key: { id: string; environment: "sandbox" | "live"; maskedToken: string };
    token: string;
  }>("/v1/developers/keys", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      environment: "test",
      label: "E2E Sandbox Key",
    },
  });

  const checkoutPlans = await apiRequest<
    Array<{ id: string; planCode: string; name: string }>
  >("/v1/checkout/plans", {
    method: "GET",
    headers: {
      "x-renew-secret-key": developerKey.data.token,
    },
  });

  if (!checkoutPlans.data.some((entry) => entry.id === plan.data.id)) {
    throw new Error("Checkout plan listing did not include the sandbox plan.");
  }

  const checkoutSession = await apiRequest<{
    clientSecret: string;
    session: {
      id: string;
      environment: "sandbox" | "live";
      status: string;
      nextAction: string;
    };
  }>("/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "x-renew-secret-key": developerKey.data.token,
    },
    body: {
      planId: plan.data.id,
      expiresInMinutes: 30,
    },
  });

  const checkoutSessionState = await apiRequest<{
    id: string;
    environment: "sandbox" | "live";
    status: string;
    nextAction: string;
  }>(`/v1/checkout/sessions/${checkoutSession.data.session.id}`, {
    method: "GET",
    headers: {
      "x-renew-client-secret": checkoutSession.data.clientSecret,
    },
  });

  if (checkoutSessionState.data.environment !== "sandbox") {
    throw new Error(
      `Checkout session should be sandbox, received ${checkoutSessionState.data.environment}.`
    );
  }

  if (checkoutSessionState.data.status !== "open") {
    throw new Error(
      `Checkout session should start open, received ${checkoutSessionState.data.status}.`
    );
  }

  console.log("9. Creating a sandbox customer and subscription.");

  const customerRef = `cust-${randomUUID().slice(0, 8)}`;
  await apiRequest<{ id: string }>("/v1/customers", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      environment: "test",
      customerRef,
      name: "MVP Customer",
      email: `billing+${customerRef}@example.com`,
      market: "ZMW",
      status: "active",
      billingState: "healthy",
      paymentMethodState: "ok",
      subscriptionCount: 1,
      monthlyVolumeUsdc: planUsdAmount,
      autoReminderEnabled: true,
    },
  });

  const subscription = await apiRequest<{ id: string; customerRef: string }>(
    "/v1/subscriptions",
    {
      method: "POST",
      token,
      body: {
        merchantId: seeded.merchantId,
        environment: "test",
        planId: plan.data.id,
        customerRef,
        customerName: "MVP Customer",
        billingCurrency: "ZMW",
        localAmount: 700,
        paymentAccountType: "bank",
        paymentAccountNumber: "1111111111",
        paymentNetworkId: network.externalId,
        status: "active",
        nextChargeAt: new Date().toISOString(),
      },
    }
  );

  console.log("10. Running the subscription charge flow.");
  const queuedCharge = await apiRequest<{
    queued: boolean;
    processedInline: boolean;
    subscriptionId: string;
    result?: SubscriptionChargeResult;
  }>(`/v1/subscriptions/${subscription.data.id}/queue-charge`, {
    method: "POST",
    token,
    body: {
      environment: "test",
    },
  });

  const chargeResult =
    queuedCharge.data.result?.chargeId && queuedCharge.data.result?.settlementId
      ? queuedCharge.data.result
      : queuedCharge.data.queued
        ? await waitForQueuedChargeResult({
            merchantId: seeded.merchantId,
            subscriptionId: subscription.data.id,
            environment: "test",
          })
        : null;

  if (!chargeResult?.chargeId || !chargeResult.settlementId) {
    throw new Error("Subscription charge did not produce a charge and settlement.");
  }

  console.log("11. Simulating the Yellow Card fiat settlement callback.");
  const webhook = await apiRequest<{
    processed: boolean;
    matched: boolean;
    chargeId: string | null;
    settlementId: string | null;
    chargeStatus: string | null;
  }>("/v1/payment-rails/webhooks/yellow-card", {
    method: "POST",
    body: {
      environment: "test",
      sequenceId: chargeResult.externalChargeId,
      state: "complete",
    },
  });

  const bridgedSettlement = await waitForSettlementBridgeReady({
    token,
    settlementId: chargeResult.settlementId,
  });

  console.log("12. Creating the treasury sweep operation.");
  const requestedSweep = await apiRequest<{
    id: string;
    status: string;
    threshold: number;
    approvedCount: number;
  }>(`/v1/settlements/${chargeResult.settlementId}/sweeps/request`, {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      environment: "test",
    },
  });

  console.log("13. Signing and approving the treasury operation.");
  const signingPayloadResponse = await apiRequest<{
    operation: { id: string; safeTxHash: string; safeNonce: number };
    signingPayload: {
      safeAddress: string;
      safeTxHash: string;
      safeNonce: number;
      typedData: {
        domain: Record<string, unknown>;
        types: Record<string, Array<{ name: string; type: string }>>;
        primaryType: string;
        message: Record<string, unknown>;
      };
    };
  }>(`/v1/treasury/operations/${requestedSweep.data.id}/signing-payload`, {
    method: "GET",
    token,
  });

  const typedData = signingPayloadResponse.data.signingPayload.typedData;
  const signTypedData = ownerAccount.signTypedData as (
    payload: unknown
  ) => Promise<Hex>;
  const treasurySignature = await signTypedData({
    domain: typedData.domain as never,
    types: typedData.types as never,
    primaryType: typedData.primaryType as never,
    message: typedData.message as never,
  });

  const approvedOperation = await apiRequest<{
    id: string;
    status: string;
    approvedCount: number;
    threshold: number;
    safeTxHash: string | null;
  }>(`/v1/treasury/operations/${requestedSweep.data.id}/approve`, {
    method: "POST",
    token,
    body: {
      signature: treasurySignature,
    },
  });

  console.log("14. Executing the treasury operation.");
  const executedOperation = await apiRequest<{
    id: string;
    status: string;
    txHash: string | null;
  }>(`/v1/treasury/operations/${requestedSweep.data.id}/execute`, {
    method: "POST",
    token,
    body: {},
  });

  console.log("15. Asserting final API state.");
  const finalCharge = await apiRequest<{ id: string; status: string; failureCode: string | null }>(
    `/v1/charges/${chargeResult.chargeId}?environment=test`,
    {
      method: "GET",
      token,
    }
  );
  const finalTreasury = await apiRequest<{
    account: { safeAddress: string; threshold: number } | null;
  }>(`/v1/treasury/${seeded.merchantId}?environment=test`, {
    method: "GET",
    token,
  });

  if (!webhook.data.processed || !webhook.data.matched) {
    throw new Error("Yellow Card webhook did not resolve the target charge.");
  }

  if (approvedOperation.data.status !== "approved") {
    throw new Error(
      `Treasury operation should be approved, received ${approvedOperation.data.status}.`
    );
  }

  if (executedOperation.data.status !== "executed" || !executedOperation.data.txHash) {
    throw new Error("Treasury operation did not execute successfully.");
  }

  const settledState = await waitForSettledState({
    token,
    settlementId: chargeResult.settlementId,
    chargeId: chargeResult.chargeId,
    treasuryTxHash: executedOperation.data.txHash as Hex,
  });

  if (settledState.charge.status !== "settled") {
    throw new Error(
      `Charge should be settled after confirmation, received ${settledState.charge.status}.`
    );
  }

  if (settledState.settlement.status !== "settled") {
    throw new Error(
      `Settlement should be settled after confirmation, received ${settledState.settlement.status}.`
    );
  }

  if (!settledState.settlement.txHash) {
    throw new Error("Settlement did not receive the treasury execution tx hash.");
  }

  if (!finalTreasury.data.account?.safeAddress) {
    throw new Error("Treasury Safe was not persisted for the merchant.");
  }

  const finalSettlement = await apiRequest<{
    id: string;
    status: string;
    txHash: string | null;
    bridgeSourceTxHash: string | null;
    bridgeReceiveTxHash: string | null;
    creditTxHash: string | null;
  }>(`/v1/settlements/${chargeResult.settlementId}?environment=test`, {
    method: "GET",
    token,
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        merchantId: seeded.merchantId,
        teamMemberId: seeded.teamMemberId,
        safeAddress: finalTreasury.data.account.safeAddress,
        planId: plan.data.id,
        subscriptionId: subscription.data.id,
        chargeId: chargeResult.chargeId,
        settlementId: chargeResult.settlementId,
        treasuryOperationId: requestedSweep.data.id,
        treasuryExecutionTxHash: executedOperation.data.txHash,
        bridgeSourceTxHash: finalSettlement.data.bridgeSourceTxHash,
        bridgeReceiveTxHash: finalSettlement.data.bridgeReceiveTxHash,
        creditTxHash: finalSettlement.data.creditTxHash,
        chargeStatus: settledState.charge.status,
        settlementStatus: settledState.settlement.status,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error: unknown) => {
    console.error(error);
    await disconnectFromDatabase();
    process.exit(1);
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
