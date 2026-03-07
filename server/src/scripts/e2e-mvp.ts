import { randomBytes, randomUUID } from "crypto";

import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { env } from "@/config/env.config";
import { connectToDatabase, disconnectFromDatabase } from "@/config/db.config";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { TeamMemberModel } from "@/features/teams/team.model";
import { createSafeProvider } from "@/features/treasury/providers/safe/safe.factory";
import { createPasswordHash } from "@/shared/utils/password-hash";
import { getPermissionsForRole } from "@/shared/constants/team-rbac";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SIX_DECIMAL_SCALE = 1_000_000n;
const encodeContractCall = encodeFunctionData as (input: unknown) => Hex;

const renewProtocolAdminAbi = parseAbi([
  "function nextPlanId() view returns (uint256)",
  "function nextSubscriptionId() view returns (uint256)",
  "function registerMerchant(address payoutWallet,address reserveWallet,bytes32 metadataHash)",
  "function createPlan(bytes32 planCode,uint128 usdPrice,uint64 billingInterval,uint32 trialPeriod,uint32 retryWindow,uint8 maxRetryCount,uint8 billingMode,uint128 usageRate) returns (uint256)",
  "function createSubscription(uint256 planId,bytes32 customerRef,bytes32 billingCurrency,uint64 firstChargeAt,uint128 localAmountSnapshot,bytes32 mandateHash) returns (uint256)",
  "function executeCharge(uint256 subscriptionId,bytes32 externalChargeId,address settlementSource,uint128 localAmount,uint128 fxRate,uint128 usageUnits,uint128 usdcAmount) returns (uint256)",
]);

const mockUsdcAbi = parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)",
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

function generateEphemeralPrivateKey(): Hex {
  return `0x${randomBytes(32).toString("hex")}` as Hex;
}

function getBaseUrl() {
  const port = process.env.PORT ?? String(env.PORT);
  return process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
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
    environmentMode: "test",
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

function getUsdcAddress() {
  return getRequiredTestValue(
    "USDC_TOKEN_ADDRESS_TEST",
    env.USDC_TOKEN_ADDRESS_TEST
  ) as Address;
}

function toUsdcBaseUnits(amount: bigint) {
  return amount * SIX_DECIMAL_SCALE;
}

async function waitForHash(publicClient: ReturnType<typeof createPublicClient>, hash: Hex) {
  await publicClient.waitForTransactionReceipt({ hash });
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

  await apiRequest(`/v1/settlements/${input.settlementId}`, {
    method: "PATCH",
    token: input.token,
    body: {
      status: "settled",
      txHash: input.treasuryTxHash,
      settledAt: new Date().toISOString(),
    },
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const [settlement, charge] = await Promise.all([
      apiRequest<{ id: string; status: string; txHash: string | null }>(
        `/v1/settlements/${input.settlementId}`,
        {
          method: "GET",
          token: input.token,
        }
      ),
      apiRequest<{ id: string; status: string; failureCode: string | null }>(
        `/v1/charges/${input.chargeId}`,
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

async function prepareOnchainMerchantBalance(input: {
  safeAddress: string;
  ownerPrivateKey: Hex;
  payoutWalletAddress: string;
  reserveWalletAddress: string;
}) {
  const rpcUrl = getTestRpcUrl();
  const publicClient = createPublicClient({
    transport: http(rpcUrl),
  });
  const executorAccount = privateKeyToAccount(getExecutorPrivateKey());
  const executorWalletClient = createWalletClient({
    account: executorAccount,
    transport: http(rpcUrl),
  });
  const protocolAddress = getProtocolAddress();
  const usdcAddress = getUsdcAddress();

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
        stringToHex("renew-mvp-merchant", { size: 32 }),
      ],
    }),
    origin: "e2e:register-merchant",
  });

  const nextPlanId = await publicClient.readContract({
    address: protocolAddress,
    abi: renewProtocolAdminAbi,
    functionName: "nextPlanId",
  });

  await executeSafeCall({
    safeAddress: input.safeAddress,
    ownerPrivateKey: input.ownerPrivateKey,
    targetAddress: protocolAddress,
    data: encodeContractCall({
      abi: renewProtocolAdminAbi,
      functionName: "createPlan",
      args: [
        stringToHex("MVP-ONCHAIN-PLAN", { size: 32 }),
        toUsdcBaseUnits(25n),
        30 * 24 * 60 * 60,
        0,
        24 * 60 * 60,
        3,
        0,
        0,
      ],
    }),
    origin: "e2e:create-plan",
  });

  const nextSubscriptionId = await publicClient.readContract({
    address: protocolAddress,
    abi: renewProtocolAdminAbi,
    functionName: "nextSubscriptionId",
  });

  await executeSafeCall({
    safeAddress: input.safeAddress,
    ownerPrivateKey: input.ownerPrivateKey,
    targetAddress: protocolAddress,
    data: encodeContractCall({
      abi: renewProtocolAdminAbi,
      functionName: "createSubscription",
      args: [
        nextPlanId,
        stringToHex("cust-mvp-chain", { size: 32 }),
        stringToHex("ZMW", { size: 32 }),
        0n,
        700n,
        stringToHex("mandate-mvp-chain", { size: 32 }),
      ],
    }),
    origin: "e2e:create-subscription",
  });

  const approvalNonce = await publicClient.getTransactionCount({
    address: executorAccount.address,
    blockTag: "pending",
  });
  const approvalHash = await executorWalletClient.writeContract({
    address: usdcAddress,
    abi: mockUsdcAbi,
    functionName: "approve",
    args: [protocolAddress, toUsdcBaseUnits(25n)],
    chain: undefined,
    nonce: approvalNonce,
  });
  await waitForHash(publicClient, approvalHash);

  const executeChargeNonce = await publicClient.getTransactionCount({
    address: executorAccount.address,
    blockTag: "pending",
  });
  const executeChargeHash = await executorWalletClient.writeContract({
    address: protocolAddress,
    abi: renewProtocolAdminAbi,
    functionName: "executeCharge",
    args: [
      nextSubscriptionId,
      stringToHex(`mvp-${Date.now()}`, { size: 32 }),
      executorAccount.address,
      700n,
      28n,
      0n,
      toUsdcBaseUnits(25n),
    ],
    chain: undefined,
    nonce: executeChargeNonce,
  });
  await waitForHash(publicClient, executeChargeHash);
}

async function main() {
  assertTestnetPrerequisites();

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
      mode: "create",
      threshold: 1,
      ownerTeamMemberIds: [seeded.teamMemberId],
    },
  });

  console.log("4. Seeding the on-chain merchant balance on Fuji.");
  await prepareOnchainMerchantBalance({
    safeAddress: treasury.data.safeAddress,
    ownerPrivateKey: seeded.ownerPrivateKey,
    payoutWalletAddress: seeded.payoutWalletAddress,
    reserveWalletAddress: seeded.reserveWalletAddress,
  });

  console.log("5. Syncing test payment rails.");
  const syncedChannels = await apiRequest<
    Array<{ externalId: string; country: string; currency: string }>
  >("/v1/payment-rails/channels/sync", {
    method: "POST",
    token,
    body: {
      country: "ZM",
    },
  });
  const syncedNetworks = await apiRequest<
    Array<{ externalId: string; country: string; name: string }>
  >("/v1/payment-rails/networks/sync", {
    method: "POST",
    token,
    body: {
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

  console.log("6. Creating a live plan, customer, and subscription.");
  const plan = await apiRequest<{ id: string; name: string }>("/v1/plans", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      planCode: `MVP-${Date.now()}`,
      name: "Core Pro",
      usdAmount: 25,
      billingIntervalDays: 30,
      trialDays: 0,
      retryWindowHours: 24,
      billingMode: "fixed",
      supportedMarkets: ["ZMW"],
      status: "active",
    },
  });

  const customerRef = `cust-${randomUUID().slice(0, 8)}`;
  await apiRequest<{ id: string }>("/v1/customers", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      customerRef,
      name: "MVP Customer",
      email: `billing+${customerRef}@example.com`,
      market: "ZMW",
      status: "active",
      billingState: "healthy",
      paymentMethodState: "ok",
      subscriptionCount: 1,
      monthlyVolumeUsdc: 25,
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

  console.log("7. Recording a charge and linked settlement.");
  const externalChargeId = `mvp-charge-${Date.now()}`;
  const charge = await apiRequest<{
    id: string;
    externalChargeId: string;
    status: string;
  }>("/v1/charges", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      subscriptionId: subscription.data.id,
      externalChargeId,
      localAmount: 700,
      fxRate: 28,
      usdcAmount: 25,
      feeAmount: 1.25,
      status: "pending",
    },
  });

  const settlement = await apiRequest<{
    id: string;
    status: string;
    batchRef: string;
  }>("/v1/settlements", {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
      sourceChargeId: charge.data.id,
      batchRef: `settlement-${externalChargeId}`,
      grossUsdc: 25,
      feeUsdc: 1.25,
      netUsdc: 23.75,
      destinationWallet: treasury.data.payoutWallet,
      status: "queued",
      scheduledFor: new Date().toISOString(),
    },
  });

  console.log("8. Simulating the Yellow Card fiat settlement callback.");
  const webhook = await apiRequest<{
    processed: boolean;
    matched: boolean;
    chargeId: string | null;
    settlementId: string | null;
    chargeStatus: string | null;
  }>("/v1/payment-rails/webhooks/yellow-card", {
    method: "POST",
    body: {
      sequenceId: charge.data.externalChargeId,
      state: "complete",
    },
  });

  console.log("9. Creating the treasury sweep operation.");
  const requestedSweep = await apiRequest<{
    id: string;
    status: string;
    threshold: number;
    approvedCount: number;
  }>(`/v1/settlements/${settlement.data.id}/sweeps/request`, {
    method: "POST",
    token,
    body: {
      merchantId: seeded.merchantId,
    },
  });

  console.log("10. Signing and approving the treasury operation.");
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

  console.log("11. Executing the treasury operation.");
  const executedOperation = await apiRequest<{
    id: string;
    status: string;
    txHash: string | null;
  }>(`/v1/treasury/operations/${requestedSweep.data.id}/execute`, {
    method: "POST",
    token,
    body: {},
  });

  console.log("12. Asserting final API state.");
  const finalCharge = await apiRequest<{ id: string; status: string; failureCode: string | null }>(
    `/v1/charges/${charge.data.id}`,
    {
      method: "GET",
      token,
    }
  );
  const finalSettlement = await apiRequest<{
    id: string;
    status: string;
    txHash: string | null;
  }>(`/v1/settlements/${settlement.data.id}`, {
    method: "GET",
    token,
  });
  const finalTreasury = await apiRequest<{
    account: { safeAddress: string; threshold: number } | null;
  }>(`/v1/treasury/${seeded.merchantId}`, {
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
    settlementId: settlement.data.id,
    chargeId: charge.data.id,
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

  console.log(
    JSON.stringify(
      {
        success: true,
        merchantId: seeded.merchantId,
        teamMemberId: seeded.teamMemberId,
        safeAddress: finalTreasury.data.account.safeAddress,
        planId: plan.data.id,
        subscriptionId: subscription.data.id,
        chargeId: charge.data.id,
        settlementId: settlement.data.id,
        treasuryOperationId: requestedSweep.data.id,
        treasuryExecutionTxHash: executedOperation.data.txHash,
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
