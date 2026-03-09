import { randomBytes } from "crypto";

import { Types } from "mongoose";
import { createPublicClient, getAddress, http, parseAbi, verifyMessage } from "viem";

import { getProtocolRuntimeConfig } from "@/config/protocol.config";
import { getSafeConfig } from "@/config/safe.config";
import { appendAuditLog } from "@/features/audit/audit.service";
import { ChargeModel } from "@/features/charges/charge.model";
import { CheckoutSessionModel } from "@/features/checkout/checkout-session.model";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { PlanModel } from "@/features/plans/plan.model";
import { SettingModel } from "@/features/settings/setting.model";
import { SubscriptionModel } from "@/features/subscriptions/subscription.model";
import { TeamMemberModel } from "@/features/teams/team.model";
import { createSafeProvider } from "@/features/treasury/providers/safe/safe.factory";
import {
  cancelProtocolSubscription,
  createProtocolSubscriptionForMerchant,
  deriveProtocolMandateHash,
  encodeMerchantRegisterCall,
  encodePlanCreateCall,
  encodePlanUpdateCall,
  encodeSetSubscriptionOperatorCall,
  pauseProtocolSubscription,
  resumeProtocolSubscription,
  extractPlanIdFromTransaction,
  extractSubscriptionIdFromTransaction,
  getRenewSubscriptionOperatorAddress,
  isMerchantSubscriptionOperatorAuthorized,
  isProtocolMerchantRegistered,
  updateProtocolSubscriptionMandate,
} from "@/features/treasury/protocol-sync";
import {
  encodePayoutWalletChangeConfirmCall,
  encodePayoutWalletChangeRequestCall,
  encodeReserveWalletClearCall,
  encodeReserveWalletPromoteCall,
  encodeReserveWalletUpdateCall,
  encodeWithdrawCallBaseUnits,
  fromUsdcBaseUnits,
  toUsdcBaseUnits,
} from "@/features/treasury/treasury.protocol";
import { TreasuryAccountModel } from "@/features/treasury/treasury-account.model";
import { TreasuryOperationModel } from "@/features/treasury/treasury-operation.model";
import { TreasurySignerModel } from "@/features/treasury/treasury-signer.model";
import type {
  AddTreasuryOwnerInput,
  BootstrapTreasuryInput,
  CreateTreasurySignerChallengeInput,
  RejectTreasuryOperationInput,
  RemoveTreasuryOwnerInput,
  UpdateTreasuryThresholdInput,
  VerifyTreasurySignerInput,
} from "@/features/treasury/treasury.validation";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import { createRuntimeModeCondition, toStoredRuntimeMode } from "@/shared/utils/runtime-environment";
import { HttpError } from "@/shared/errors/http-error";

import { SettlementModel } from "@/features/settlements/settlement.model";

const PAYOUT_WALLET_CHANGE_DELAY_MS = 24 * 60 * 60 * 1000;
const renewProtocolReadAbi = parseAbi([
  "function protocolFeeBps() view returns (uint16)",
]);

type SubscriptionChargeJobResult = Awaited<
  ReturnType<typeof import("@/features/charges/charge.service").runSubscriptionChargeJob>
>;

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function syncCheckoutSessionWithChargeResult(input: {
  checkoutSessionId: string;
  billingCurrency: string;
  chargeResult: SubscriptionChargeJobResult;
}) {
  const session = await CheckoutSessionModel.findById(input.checkoutSessionId).exec();

  if (!session) {
    return;
  }

  session.status =
    "skipped" in input.chargeResult && input.chargeResult.skipped
      ? "scheduled"
      : "chargeId" in input.chargeResult && input.chargeResult.chargeId
        ? "pending_payment"
        : "scheduled";

  if ("chargeId" in input.chargeResult && input.chargeResult.chargeId) {
    const createdCharge = await ChargeModel.findById(input.chargeResult.chargeId)
      .select({ usdcAmount: 1, feeAmount: 1, status: 1, localAmount: 1 })
      .lean()
      .exec();

    session.chargeId = new Types.ObjectId(input.chargeResult.chargeId);
    session.settlementId =
      "settlementId" in input.chargeResult && input.chargeResult.settlementId
        ? new Types.ObjectId(input.chargeResult.settlementId)
        : null;
    session.paymentSnapshot = {
      externalChargeId:
        "externalChargeId" in input.chargeResult
          ? input.chargeResult.externalChargeId ?? null
          : null,
      billingCurrency: input.billingCurrency,
      localAmount: createdCharge?.localAmount ?? null,
      usdcAmount: createdCharge?.usdcAmount ?? null,
      feeAmount: createdCharge?.feeAmount ?? null,
      status:
        createdCharge?.status ??
        ("collectionStatus" in input.chargeResult
          ? input.chargeResult.collectionStatus ?? "pending"
          : "pending"),
      collectionId:
        "collection" in input.chargeResult
          ? toNullableString(
            (input.chargeResult.collection as Record<string, unknown>).id
          )
          : null,
      collectionSequenceId:
        "collection" in input.chargeResult
          ? toNullableString(
            (input.chargeResult.collection as Record<string, unknown>).sequenceId
          )
          : null,
      collectionReference:
        "collection" in input.chargeResult
          ? toNullableString(
            (input.chargeResult.collection as Record<string, unknown>).reference
          )
          : null,
      depositId:
        "collection" in input.chargeResult
          ? toNullableString(
            (input.chargeResult.collection as Record<string, unknown>).depositId
          )
          : null,
      expiresAt:
        "collection" in input.chargeResult &&
          (input.chargeResult.collection as Record<string, unknown>).expiresAt
          ? new Date(
            (input.chargeResult.collection as Record<string, unknown>).expiresAt as string
          )
          : null,
      bankInfo:
        "collection" in input.chargeResult &&
          typeof (input.chargeResult.collection as Record<string, unknown>).bankInfo ===
          "object" &&
          (input.chargeResult.collection as Record<string, unknown>).bankInfo !== null
          ? {
            name: toNullableString(
              ((input.chargeResult.collection as Record<string, unknown>).bankInfo as Record<
                string,
                unknown
              >).name
            ),
            accountNumber: toNullableString(
              ((input.chargeResult.collection as Record<string, unknown>).bankInfo as Record<
                string,
                unknown
              >).accountNumber
            ),
            accountName: toNullableString(
              ((input.chargeResult.collection as Record<string, unknown>).bankInfo as Record<
                string,
                unknown
              >).accountName
            ),
          }
          : null,
    };
    session.failureReason = null;
  }

  await session.save();
}

function mapRetryPolicyToMaxRetryCount(input: {
  autoRetries?: boolean | null;
  retryPolicy?: string | null;
}) {
  if (!input.autoRetries) {
    return 0;
  }

  switch ((input.retryPolicy ?? "").trim()) {
    case "No automatic retries":
      return 0;
    case "2 retries over 3 days":
      return 2;
    default:
      return 3;
  }
}

async function getMerchantMaxRetryCount(merchantId: string) {
  const setting = await SettingModel.findOne({ merchantId })
    .select({ autoRetries: 1, retryPolicy: 1 })
    .lean()
    .exec();

  return mapRetryPolicyToMaxRetryCount(setting ?? {});
}

async function getProtocolFeeBps(environment: RuntimeMode) {
  const protocolConfig = getProtocolRuntimeConfig(environment);
  const client = createPublicClient({
    transport: http(protocolConfig.rpcUrl),
  });

  return client.readContract({
    address: getAddress(protocolConfig.protocolAddress),
    abi: renewProtocolReadAbi,
    functionName: "protocolFeeBps",
  });
}

function toTreasurySignerResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  teamMemberId: { toString(): string };
  walletAddress: string;
  status: string;
  challengeMessage?: string | null;
  challengeIssuedAt?: Date | null;
  verifiedAt?: Date | null;
  revokedAt?: Date | null;
  lastApprovedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    teamMemberId: document.teamMemberId.toString(),
    walletAddress: document.walletAddress,
    status: document.status,
    challengeMessage: document.challengeMessage ?? null,
    challengeIssuedAt: document.challengeIssuedAt ?? null,
    verifiedAt: document.verifiedAt ?? null,
    revokedAt: document.revokedAt ?? null,
    lastApprovedAt: document.lastApprovedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toTreasuryOperationResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  treasuryAccountId: { toString(): string };
  settlementId?: { toString(): string } | null;
  kind: string;
  status: string;
  safeAddress: string;
  safeTxHash?: string | null;
  safeNonce?: number | null;
  threshold: number;
  targetAddress: string;
  value: string;
  data: string;
  origin: string;
  createdBy: string;
  signatures: Array<{
    teamMemberId: string;
    name: string;
    email: string;
    role: string;
    walletAddress: string;
    signedAt: Date;
  }>;
  txHash?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  executedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    treasuryAccountId: document.treasuryAccountId.toString(),
    settlementId: document.settlementId?.toString() ?? null,
    kind: document.kind,
    status: document.status,
    safeAddress: document.safeAddress,
    safeTxHash: document.safeTxHash ?? null,
    safeNonce: document.safeNonce ?? null,
    threshold: document.threshold,
    approvedCount: document.signatures.length,
    canExecute:
      document.status === "approved" &&
      document.signatures.length >= document.threshold,
    targetAddress: document.targetAddress,
    value: document.value,
    data: document.data,
    origin: document.origin,
    createdBy: document.createdBy,
    signatures: document.signatures.map((entry) => ({
      teamMemberId: entry.teamMemberId,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      walletAddress: entry.walletAddress,
      signedAt: entry.signedAt,
    })),
    txHash: document.txHash ?? null,
    rejectedBy: document.rejectedBy ?? null,
    rejectionReason: document.rejectionReason ?? null,
    rejectedAt: document.rejectedAt ?? null,
    executedAt: document.executedAt ?? null,
    metadata: document.metadata ?? {},
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toTreasuryAccountResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  custodyModel: string;
  safeAddress: string;
  payoutWallet: string;
  reserveWallet?: string | null;
  ownerAddresses: string[];
  threshold: number;
  chainId: number;
  txServiceUrl: string;
  gasPolicy: string;
  status: string;
  pendingPayoutWallet?: string | null;
  payoutWalletChangeReadyAt?: Date | null;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    custodyModel: document.custodyModel,
    safeAddress: document.safeAddress,
    payoutWallet: document.payoutWallet,
    reserveWallet: document.reserveWallet ?? null,
    ownerAddresses: document.ownerAddresses,
    threshold: document.threshold,
    chainId: document.chainId,
    txServiceUrl: document.txServiceUrl,
    gasPolicy: document.gasPolicy,
    status: document.status,
    pendingPayoutWallet: document.pendingPayoutWallet ?? null,
    payoutWalletChangeReadyAt: document.payoutWalletChangeReadyAt ?? null,
    lastSyncedAt: document.lastSyncedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function getMerchantOrThrow(merchantId: string) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  return merchant;
}

async function getTeamMemberOrThrow(merchantId: string, teamMemberId: string) {
  const member = await TeamMemberModel.findOne({
    _id: teamMemberId,
    merchantId,
  }).exec();

  if (!member) {
    throw new HttpError(404, "Team member was not found.");
  }

  return member;
}

async function syncWalletState(input: {
  merchantId: string;
  payoutWallet: string;
  reserveWallet: string | null;
}) {
  const [merchant, setting] = await Promise.all([
    MerchantModel.findById(input.merchantId).exec(),
    SettingModel.findOne({ merchantId: input.merchantId }).exec(),
  ]);

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  merchant.payoutWallet = input.payoutWallet;
  merchant.reserveWallet = input.reserveWallet;

  if (setting) {
    setting.primaryWallet = input.payoutWallet;
    setting.reserveWallet = input.reserveWallet;
    await setting.save();
  }

  await merchant.save();
}

async function syncSettlementChargeState(input: {
  settlementId: string;
  status: "confirming" | "settled" | "reversed";
  txHash?: string | null;
}) {
  const settlement = await SettlementModel.findById(input.settlementId).exec();

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  settlement.status = input.status;

  if (input.txHash !== undefined) {
    settlement.txHash = input.txHash ?? null;
  }

  if (input.status === "confirming" && !settlement.submittedAt) {
    settlement.submittedAt = new Date();
  }

  if (input.status === "settled" && !settlement.settledAt) {
    settlement.settledAt = new Date();
  }

  if (input.status === "reversed" && !settlement.reversedAt) {
    settlement.reversedAt = new Date();
  }

  await settlement.save();

  if (settlement.sourceChargeId) {
    const nextChargeStatus =
      input.status === "confirming"
        ? "confirming"
        : input.status === "settled"
          ? "settled"
          : "reversed";

    await ChargeModel.findByIdAndUpdate(settlement.sourceChargeId, {
      status: nextChargeStatus,
      failureCode:
        nextChargeStatus === "reversed" ? "settlement_reversed" : null,
      processedAt: new Date(),
    }).exec();
  }
}

async function createTreasuryAccountFromSafe(input: {
  merchantId: string;
  environment: RuntimeMode;
  safeAddress: string;
  owners: string[];
  threshold: number;
  payoutWallet: string;
  reserveWallet: string | null;
  mode: RuntimeMode;
}) {
  const safeConfig = getSafeConfig(input.mode);

  return TreasuryAccountModel.create({
    merchantId: new Types.ObjectId(input.merchantId),
    environment: input.environment,
    custodyModel: "safe",
    safeAddress: normalizeAddress(input.safeAddress),
    payoutWallet: normalizeAddress(input.payoutWallet),
    reserveWallet: input.reserveWallet
      ? normalizeAddress(input.reserveWallet)
      : null,
    ownerAddresses: input.owners.map(normalizeAddress),
    threshold: input.threshold,
    chainId: Number(safeConfig.chainId),
    txServiceUrl: safeConfig.txServiceUrl,
    gasPolicy: "sponsored",
    status: "active",
    pendingPayoutWallet: null,
    payoutWalletChangeReadyAt: null,
    lastSyncedAt: new Date(),
  });
}

async function ensureTreasuryAccount(
  merchantId: string,
  environment: RuntimeMode
) {
  const existing = await TreasuryAccountModel.findOne({
    merchantId,
    ...createRuntimeModeCondition("environment", environment),
  }).exec();

  if (existing) {
    return existing;
  }

  throw new HttpError(
    409,
    "Treasury Safe is not configured for this merchant yet."
  );
}

async function syncTreasuryAccountOwners(
  merchantId: string,
  environment: RuntimeMode
) {
  const treasuryAccount = await TreasuryAccountModel.findOne({
    merchantId,
    ...createRuntimeModeCondition("environment", environment),
  }).exec();

  if (!treasuryAccount) {
    return null;
  }

  const provider = createSafeProvider(environment);
  const safeInfo = await provider.getSafeInfo(treasuryAccount.safeAddress);

  treasuryAccount.ownerAddresses = safeInfo.owners.map(normalizeAddress);
  treasuryAccount.threshold = safeInfo.threshold;
  treasuryAccount.lastSyncedAt = new Date();
  await treasuryAccount.save();

  return treasuryAccount;
}

function buildSignerChallengeMessage(input: {
  merchantId: string;
  teamMemberId: string;
  walletAddress: string;
  nonce: string;
}) {
  return [
    "Renew treasury signer verification",
    `Merchant: ${input.merchantId}`,
    `Team member: ${input.teamMemberId}`,
    `Wallet: ${input.walletAddress}`,
    `Nonce: ${input.nonce}`,
  ].join("\n");
}

function requireTreasuryOperationStatus(status: string) {
  if (status === "executed") {
    throw new HttpError(409, "Treasury operation has already been executed.");
  }

  if (status === "rejected") {
    throw new HttpError(409, "Treasury operation has been rejected.");
  }
}

async function ensureTreasuryApprover(input: {
  merchantId: string;
  teamMemberId: string;
}) {
  const [member, signerBinding] = await Promise.all([
    getTeamMemberOrThrow(input.merchantId, input.teamMemberId),
    TreasurySignerModel.findOne({
      merchantId: input.merchantId,
      teamMemberId: input.teamMemberId,
      status: "active",
    }).exec(),
  ]);

  if (member.status !== "active") {
    throw new HttpError(403, "Treasury approver is not active.");
  }

  if (!signerBinding) {
    throw new HttpError(
      409,
      "Treasury signer is not verified for this team member."
    );
  }

  return {
    member,
    signerBinding,
  };
}

async function ensureTreasurySignerMatchesSafe(input: {
  merchantId: string;
  teamMemberId: string;
  treasuryAccount: Awaited<ReturnType<typeof ensureTreasuryAccount>>;
}) {
  const { member, signerBinding } = await ensureTreasuryApprover({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
  });

  const signerWallet = normalizeAddress(signerBinding.walletAddress);
  const safeOwners = new Set(
    input.treasuryAccount.ownerAddresses.map(normalizeAddress)
  );

  if (safeOwners.size > 0 && !safeOwners.has(signerWallet)) {
    throw new HttpError(
      403,
      "Bound signer wallet is not an owner of the configured treasury Safe."
    );
  }

  return {
    member,
    signerBinding,
  };
}

async function loadOperationWithTreasury(operationId: string, merchantId?: string) {
  const operation = await TreasuryOperationModel.findById(operationId).exec();

  if (!operation) {
    throw new HttpError(404, "Treasury operation was not found.");
  }

  if (merchantId && operation.merchantId.toString() !== merchantId) {
    throw new HttpError(403, "Treasury operation does not belong to this merchant.");
  }

  const treasuryAccount = await TreasuryAccountModel.findById(
    operation.treasuryAccountId
  ).exec();

  if (!treasuryAccount) {
    throw new HttpError(404, "Treasury account was not found.");
  }

  return {
    operation,
    treasuryAccount,
  };
}

async function findTreasurySignerBinding(input: {
  merchantId: string;
  teamMemberId: string;
}) {
  return TreasurySignerModel.findOne({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
  }).exec();
}

async function syncLinkedProtocolRecordState(input: {
  operation: Awaited<ReturnType<typeof loadOperationWithTreasury>>["operation"];
  status: string;
  txHash?: string | null;
}) {
  const metadata = (input.operation.metadata ?? {}) as Record<string, unknown>;
  const entityType = String(metadata.entityType ?? "").trim();

  if (entityType === "plan") {
    const planId = String(metadata.planId ?? "").trim();

    if (!planId) {
      return;
    }

    const plan = await PlanModel.findById(planId).exec();

    if (!plan) {
      return;
    }

    plan.protocolOperationId = input.operation._id;
    plan.protocolSyncStatus = input.status;
    if (input.txHash !== undefined) {
      plan.protocolTxHash = input.txHash ?? null;
    }
    await plan.save();
    return;
  }

  if (entityType === "subscription") {
    const subscriptionId = String(metadata.subscriptionId ?? "").trim();

    if (!subscriptionId) {
      return;
    }

    const subscription = await SubscriptionModel.findById(subscriptionId).exec();

    if (!subscription) {
      return;
    }

    subscription.protocolOperationId = input.operation._id;
    subscription.protocolSyncStatus = input.status;
    if (input.txHash !== undefined) {
      subscription.protocolTxHash = input.txHash ?? null;
    }
    await subscription.save();
  }
}

async function applyExecutedOperationEffects(input: {
  operation: Awaited<ReturnType<typeof loadOperationWithTreasury>>["operation"];
  treasuryAccount: Awaited<ReturnType<typeof loadOperationWithTreasury>>["treasuryAccount"];
}) {
  const metadata = (input.operation.metadata ?? {}) as Record<string, unknown>;
  const merchantId = input.operation.merchantId.toString();

  if (input.operation.kind === "settlement_sweep" && input.operation.settlementId) {
    await syncSettlementChargeState({
      settlementId: input.operation.settlementId.toString(),
      status: "settled",
      txHash: input.operation.txHash ?? null,
    });
    return;
  }

  if (input.operation.kind === "merchant_register") {
    await queueMerchantSubscriptionOperatorAuthorization({
      merchantId,
      actor: "system",
      environment: toStoredRuntimeMode(input.treasuryAccount.environment),
    }).catch(() => null);

    const pendingPlans = await PlanModel.find({
      merchantId,
      ...createRuntimeModeCondition(
        "environment",
        toStoredRuntimeMode(input.treasuryAccount.environment)
      ),
      protocolPlanId: null,
      $or: [{ status: "active" }, { pendingStatus: "active" }],
    })
      .select({ _id: 1 })
      .lean()
      .exec();

    for (const plan of pendingPlans) {
      await queuePlanProtocolSync({
        merchantId,
        actor: "system",
        environment: toStoredRuntimeMode(input.treasuryAccount.environment),
        planId: plan._id.toString(),
      }).catch(() => null);
    }
    return;
  }

  if (input.operation.kind === "subscription_operator_authorize") {
    const pendingSubscriptions = await SubscriptionModel.find({
      merchantId,
      ...createRuntimeModeCondition(
        "environment",
        toStoredRuntimeMode(input.treasuryAccount.environment)
      ),
      status: "pending_activation",
      protocolSubscriptionId: null,
    })
      .select({ _id: 1 })
      .lean()
      .exec();

    for (const subscription of pendingSubscriptions) {
      await queueSubscriptionProtocolCreate({
        merchantId,
        actor: "system",
        environment: toStoredRuntimeMode(input.treasuryAccount.environment),
        subscriptionId: subscription._id.toString(),
      }).catch(() => null);
    }

    return;
  }

  if (input.operation.kind === "plan_create") {
    const planId = await extractPlanIdFromTransaction(
      toStoredRuntimeMode(input.treasuryAccount.environment),
      input.operation.txHash!
    );
    const metadata = (input.operation.metadata ?? {}) as Record<string, unknown>;
    const localPlanId = String(metadata.planId ?? "").trim();

    if (localPlanId) {
      const plan = await PlanModel.findById(localPlanId).exec();

      if (plan) {
        plan.protocolPlanId = planId;
        plan.protocolOperationId = input.operation._id;
        plan.status = String(metadata.targetStatus ?? plan.pendingStatus ?? "active").trim() || "active";
        plan.pendingStatus = null;
        plan.protocolSyncStatus = "synced";
        plan.protocolTxHash = input.operation.txHash ?? null;
        await plan.save();

        const subscriptions = await SubscriptionModel.find({
          merchantId,
          planId: plan._id,
          ...createRuntimeModeCondition(
            "environment",
            toStoredRuntimeMode(input.treasuryAccount.environment)
          ),
          status: "pending_activation",
          protocolSubscriptionId: null,
        })
          .select({ _id: 1 })
          .lean()
          .exec();

        for (const subscription of subscriptions) {
          await queueSubscriptionProtocolCreate({
            merchantId,
            actor: "system",
            environment: toStoredRuntimeMode(input.treasuryAccount.environment),
            subscriptionId: subscription._id.toString(),
          }).catch(() => null);
        }
      }
    }
    return;
  }

  if (input.operation.kind === "plan_update") {
    const localPlanId = String(metadata.planId ?? "").trim();

    if (localPlanId) {
      const plan = await PlanModel.findById(localPlanId).exec();

      if (plan) {
        plan.protocolOperationId = input.operation._id;
        plan.protocolSyncStatus = "synced";
        plan.protocolTxHash = input.operation.txHash ?? null;
        const targetStatus = String(metadata.targetStatus ?? plan.pendingStatus ?? plan.status).trim();
        if (targetStatus === "active" || targetStatus === "archived" || targetStatus === "draft") {
          plan.status = targetStatus;
        }
        plan.pendingStatus = null;
        await plan.save();
      }
    }
    return;
  }

  if (input.operation.kind === "subscription_create") {
    const protocolSubscriptionId = await extractSubscriptionIdFromTransaction(
      toStoredRuntimeMode(input.treasuryAccount.environment),
      input.operation.txHash!
    );
    const metadata = (input.operation.metadata ?? {}) as Record<string, unknown>;
    const localSubscriptionId = String(metadata.subscriptionId ?? "").trim();

    if (localSubscriptionId) {
      const subscription = await SubscriptionModel.findById(localSubscriptionId).exec();

      if (subscription) {
        subscription.protocolSubscriptionId = protocolSubscriptionId;
        subscription.protocolOperationId = input.operation._id;
        subscription.status = "active";
        subscription.pendingStatus = null;
        subscription.protocolSyncStatus = "synced";
        subscription.protocolTxHash = input.operation.txHash ?? null;
        await subscription.save();

        if (metadata.triggerInitialCharge === true) {
          const { runSubscriptionChargeJob } = await import(
            "@/features/charges/charge.service"
          );
          const chargeResult = await runSubscriptionChargeJob({
            subscriptionId: subscription._id.toString(),
          });
          const checkoutSessionId = String(metadata.checkoutSessionId ?? "").trim();

          if (checkoutSessionId) {
            await syncCheckoutSessionWithChargeResult({
              checkoutSessionId,
              billingCurrency: subscription.billingCurrency,
              chargeResult,
            });
          }
        }
      }
    }
    return;
  }

  if (
    input.operation.kind === "subscription_pause" ||
    input.operation.kind === "subscription_resume" ||
    input.operation.kind === "subscription_cancel" ||
    input.operation.kind === "subscription_mandate_update"
  ) {
    const localSubscriptionId = String(metadata.subscriptionId ?? "").trim();

    if (localSubscriptionId) {
      const subscription = await SubscriptionModel.findById(localSubscriptionId).exec();

      if (subscription) {
        subscription.protocolOperationId = input.operation._id;
        subscription.protocolSyncStatus = "synced";
        subscription.protocolTxHash = input.operation.txHash ?? null;

        if (input.operation.kind === "subscription_pause") {
          subscription.status = "paused";
          subscription.pendingStatus = null;
        } else if (input.operation.kind === "subscription_resume") {
          subscription.status = "active";
          subscription.pendingStatus = null;
        } else if (input.operation.kind === "subscription_cancel") {
          subscription.status = "cancelled";
          subscription.pendingStatus = null;
        } else if (input.operation.kind === "subscription_mandate_update") {
          subscription.pendingStatus = null;
        }

        await subscription.save();
      }
    }
    return;
  }

  if (input.operation.kind === "payout_wallet_change_request") {
    const nextWallet = String(metadata.nextWallet ?? "").trim().toLowerCase();

    if (!nextWallet) {
      throw new HttpError(500, "Treasury operation is missing the next payout wallet.");
    }

    input.treasuryAccount.pendingPayoutWallet = nextWallet;
    input.treasuryAccount.payoutWalletChangeReadyAt = new Date(
      Date.now() + PAYOUT_WALLET_CHANGE_DELAY_MS
    );
    await input.treasuryAccount.save();
    return;
  }

  if (input.operation.kind === "payout_wallet_change_confirm") {
    if (
      !input.treasuryAccount.pendingPayoutWallet ||
      !input.treasuryAccount.payoutWalletChangeReadyAt
    ) {
      throw new HttpError(409, "No payout wallet change is pending.");
    }

    input.treasuryAccount.payoutWallet =
      input.treasuryAccount.pendingPayoutWallet;
    input.treasuryAccount.pendingPayoutWallet = null;
    input.treasuryAccount.payoutWalletChangeReadyAt = null;
    await input.treasuryAccount.save();
    await syncWalletState({
      merchantId,
      payoutWallet: input.treasuryAccount.payoutWallet,
      reserveWallet: input.treasuryAccount.reserveWallet ?? null,
    });
    return;
  }

  if (input.operation.kind === "reserve_wallet_update") {
    const reserveWallet = String(metadata.reserveWallet ?? "").trim().toLowerCase();

    if (!reserveWallet) {
      throw new HttpError(500, "Treasury operation is missing the reserve wallet.");
    }

    input.treasuryAccount.reserveWallet = reserveWallet;
    await input.treasuryAccount.save();
    await syncWalletState({
      merchantId,
      payoutWallet: input.treasuryAccount.payoutWallet,
      reserveWallet,
    });
    return;
  }

  if (input.operation.kind === "reserve_wallet_clear") {
    input.treasuryAccount.reserveWallet = null;
    await input.treasuryAccount.save();
    await syncWalletState({
      merchantId,
      payoutWallet: input.treasuryAccount.payoutWallet,
      reserveWallet: null,
    });
    return;
  }

  if (input.operation.kind === "reserve_wallet_promote") {
    const currentPrimaryWallet = input.treasuryAccount.payoutWallet;
    const currentReserveWallet = input.treasuryAccount.reserveWallet;

    if (!currentReserveWallet) {
      throw new HttpError(409, "Reserve wallet is not configured.");
    }

    input.treasuryAccount.payoutWallet = currentReserveWallet;
    input.treasuryAccount.reserveWallet = currentPrimaryWallet;
    input.treasuryAccount.pendingPayoutWallet = null;
    input.treasuryAccount.payoutWalletChangeReadyAt = null;
    await input.treasuryAccount.save();
    await syncWalletState({
      merchantId,
      payoutWallet: currentReserveWallet,
      reserveWallet: currentPrimaryWallet,
    });
    return;
  }

  if (
    input.operation.kind === "safe_owner_add" ||
    input.operation.kind === "safe_owner_remove" ||
    input.operation.kind === "safe_threshold_change"
  ) {
    await syncTreasuryAccountOwners(
      merchantId,
      toStoredRuntimeMode(input.treasuryAccount.environment)
    );
  }
}

export async function getTreasuryByMerchantId(
  merchantId: string,
  environment: RuntimeMode = "test"
) {
  let treasuryAccount: Awaited<ReturnType<typeof ensureTreasuryAccount>> | null = null;

  try {
    treasuryAccount = await syncTreasuryAccountOwners(merchantId, environment);
  } catch {
    treasuryAccount = await TreasuryAccountModel.findOne({
      merchantId,
      ...createRuntimeModeCondition("environment", environment),
    }).exec();
  }

  const [signers, operations] = await Promise.all([
    TreasurySignerModel.find({ merchantId }).sort({ createdAt: -1 }).exec(),
    TreasuryOperationModel.find({
      merchantId,
      ...createRuntimeModeCondition("environment", environment),
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec(),
  ]);

  return {
    account: treasuryAccount ? toTreasuryAccountResponse(treasuryAccount) : null,
    signers: signers.map(toTreasurySignerResponse),
    operations: operations.map(toTreasuryOperationResponse),
  };
}

export async function createTreasurySignerChallenge(input: {
  merchantId: string;
  teamMemberId: string;
  payload: CreateTreasurySignerChallengeInput;
}) {
  const member = await getTeamMemberOrThrow(input.merchantId, input.teamMemberId);

  if (member.status !== "active") {
    throw new HttpError(403, "Team member is not active.");
  }

  const walletAddress = normalizeAddress(input.payload.walletAddress);
  const nonce = randomBytes(16).toString("hex");
  const message = buildSignerChallengeMessage({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
    walletAddress,
    nonce,
  });
  let signerBinding = await TreasurySignerModel.findOne({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
  }).exec();

  if (!signerBinding) {
    signerBinding = await TreasurySignerModel.create({
      merchantId: new Types.ObjectId(input.merchantId),
      teamMemberId: input.teamMemberId,
      walletAddress,
      status: "pending",
      challengeNonce: nonce,
      challengeMessage: message,
      challengeIssuedAt: new Date(),
    });
  } else {
    signerBinding.walletAddress = walletAddress;
    signerBinding.status = "pending";
    signerBinding.challengeNonce = nonce;
    signerBinding.challengeMessage = message;
    signerBinding.challengeIssuedAt = new Date();
    signerBinding.verifiedAt = null;
    signerBinding.revokedAt = null;
    await signerBinding.save();
  }

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: member.name,
    action: "Requested treasury signer challenge",
    category: "security",
    status: "ok",
    target: walletAddress,
    detail: "Treasury signer challenge generated.",
    metadata: {
      teamMemberId: input.teamMemberId,
      walletAddress,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    signer: toTreasurySignerResponse(signerBinding),
    challengeMessage: message,
  };
}

export async function verifyTreasurySigner(input: {
  merchantId: string;
  teamMemberId: string;
  payload: VerifyTreasurySignerInput;
}) {
  const signerBinding = await TreasurySignerModel.findOne({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
  }).exec();

  if (!signerBinding || !signerBinding.challengeMessage) {
    throw new HttpError(409, "Treasury signer challenge is not active.");
  }

  const isValid = await verifyMessage({
    address: signerBinding.walletAddress as `0x${string}`,
    message: signerBinding.challengeMessage,
    signature: input.payload.signature as `0x${string}`,
  });

  if (!isValid) {
    throw new HttpError(401, "Treasury signer signature is invalid.");
  }

  signerBinding.status = "active";
  signerBinding.verifiedAt = new Date();
  signerBinding.challengeNonce = null;
  signerBinding.challengeMessage = null;
  signerBinding.challengeIssuedAt = null;
  await signerBinding.save();

  return toTreasurySignerResponse(signerBinding);
}

export async function revokeTreasurySigner(input: {
  merchantId: string;
  teamMemberId: string;
  actor: string;
}) {
  const signerBinding = await TreasurySignerModel.findOne({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
  }).exec();

  if (!signerBinding) {
    throw new HttpError(404, "Treasury signer binding was not found.");
  }

  signerBinding.status = "revoked";
  signerBinding.revokedAt = new Date();
  signerBinding.challengeNonce = null;
  signerBinding.challengeMessage = null;
  signerBinding.challengeIssuedAt = null;
  await signerBinding.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Revoked treasury signer",
    category: "security",
    status: "warning",
    target: signerBinding.walletAddress,
    detail: "Treasury signer binding revoked.",
    metadata: {
      teamMemberId: input.teamMemberId,
      walletAddress: signerBinding.walletAddress,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toTreasurySignerResponse(signerBinding);
}

export async function bootstrapTreasuryAccount(input: {
  merchantId: string;
  actor: string;
  payload: BootstrapTreasuryInput;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "configuring merchant treasury custody",
    input.payload.environment
  );

  const merchant = await getMerchantOrThrow(input.merchantId);
  const provider = createSafeProvider(input.payload.environment);
  let safeInfo:
    | {
      safeAddress: string;
      owners: string[];
      threshold: number;
    }
    | undefined;

  if (input.payload.mode === "create") {
    const ownerIds = [...new Set(input.payload.ownerTeamMemberIds)];
    const signerBindings = await TreasurySignerModel.find({
      merchantId: input.merchantId,
      teamMemberId: { $in: ownerIds },
      status: "active",
    }).exec();

    if (signerBindings.length !== ownerIds.length) {
      throw new HttpError(
        409,
        "Every treasury owner must have an active verified signer wallet."
      );
    }

    const owners = signerBindings.map((entry) => normalizeAddress(entry.walletAddress));
    const threshold =
      input.payload.threshold ?? Math.min(owners.length, owners.length > 1 ? 2 : 1);

    safeInfo = await provider.createSafeAccount({
      owners,
      threshold,
    });
  } else {
    safeInfo = await provider.getSafeInfo(input.payload.safeAddress!);
  }

  const conflictingTreasury = await TreasuryAccountModel.findOne({
    safeAddress: normalizeAddress(safeInfo.safeAddress),
    ...createRuntimeModeCondition("environment", input.payload.environment),
    merchantId: { $ne: merchant._id },
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (conflictingTreasury) {
    throw new HttpError(
      409,
      "This Safe is already bound to another merchant workspace."
    );
  }

  let treasuryAccount = await TreasuryAccountModel.findOne({
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.payload.environment),
  }).exec();

  if (!treasuryAccount) {
    treasuryAccount = await createTreasuryAccountFromSafe({
      merchantId: input.merchantId,
      environment: input.payload.environment,
      safeAddress: safeInfo.safeAddress,
      owners: safeInfo.owners,
      threshold: safeInfo.threshold,
      payoutWallet: merchant.payoutWallet,
      reserveWallet: merchant.reserveWallet ?? null,
      mode: input.payload.environment,
    });
  } else {
    treasuryAccount.safeAddress = normalizeAddress(safeInfo.safeAddress);
    treasuryAccount.ownerAddresses = safeInfo.owners.map(normalizeAddress);
    treasuryAccount.threshold = safeInfo.threshold;
    treasuryAccount.chainId = Number(getSafeConfig(input.payload.environment).chainId);
    treasuryAccount.txServiceUrl = getSafeConfig(input.payload.environment).txServiceUrl;
    treasuryAccount.lastSyncedAt = new Date();
    await treasuryAccount.save();
  }

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Configured treasury Safe",
    category: "security",
    status: "ok",
    target: safeInfo.safeAddress,
    detail:
      input.payload.mode === "create"
        ? "Treasury Safe created for the merchant."
        : "Treasury Safe imported for the merchant.",
    metadata: {
      safeAddress: safeInfo.safeAddress,
      threshold: safeInfo.threshold,
      ownerCount: safeInfo.owners.length,
      mode: input.payload.mode,
      environment: input.payload.environment,
    },
    ipAddress: null,
    userAgent: null,
  });

  if (merchant.reserveWallet) {
    await queueMerchantRegistrationOperation({
      merchantId: input.merchantId,
      actor: input.actor,
      environment: input.payload.environment,
    }).catch(() => null);
  }

  return toTreasuryAccountResponse(treasuryAccount);
}

export async function createSettlementSweepOperation(input: {
  merchantId: string;
  settlementId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "requesting settlement sweep approvals",
    input.environment
  );

  const [settlement, treasuryAccount, protocolFeeBps] = await Promise.all([
    SettlementModel.findOne({
      _id: input.settlementId,
      merchantId: input.merchantId,
      ...createRuntimeModeCondition("environment", input.environment),
    }).exec(),
    ensureTreasuryAccount(input.merchantId, input.environment),
    getProtocolFeeBps(input.environment),
  ]);

  if (!settlement) {
    throw new HttpError(404, "Settlement was not found.");
  }

  const existing = await TreasuryOperationModel.findOne({
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
    settlementId: input.settlementId,
    kind: "settlement_sweep",
    status: { $in: ["pending_signatures", "approved", "executed"] },
  }).exec();

  if (existing) {
    return toTreasuryOperationResponse(existing);
  }

  const protocolAddress = getSafeConfig(input.environment).protocolAddress;
  const protocolAmountUsdc =
    typeof settlement.protocolAmountUsdc === "number" &&
      Number.isFinite(settlement.protocolAmountUsdc) &&
      settlement.protocolAmountUsdc > 0
      ? settlement.protocolAmountUsdc
      : settlement.netUsdc;
  const grossBaseUnits = toUsdcBaseUnits(protocolAmountUsdc);
  const protocolFeeBaseUnits =
    (grossBaseUnits * BigInt(protocolFeeBps)) / 10_000n;
  const withdrawBaseUnits = grossBaseUnits - protocolFeeBaseUnits;

  if (withdrawBaseUnits <= 0n) {
    throw new HttpError(
      409,
      "Settlement net amount is too low after protocol fees to queue a treasury sweep."
    );
  }

  const operation = await TreasuryOperationModel.create({
    merchantId: new Types.ObjectId(input.merchantId),
    environment: input.environment,
    treasuryAccountId: treasuryAccount._id,
    settlementId: settlement._id,
    kind: "settlement_sweep",
    status: "pending_signatures",
    safeAddress: treasuryAccount.safeAddress,
    safeTxHash: null,
    safeNonce: null,
    threshold: treasuryAccount.threshold,
    targetAddress: normalizeAddress(protocolAddress),
    value: "0",
    data: encodeWithdrawCallBaseUnits(withdrawBaseUnits),
    origin: `settlement:${settlement.batchRef}`,
    createdBy: input.actor,
    signatures: [],
    metadata: {
      batchRef: settlement.batchRef,
      grossSettlementUsdc: protocolAmountUsdc,
      protocolFeeBps: Number(protocolFeeBps),
      protocolFeeUsdc: fromUsdcBaseUnits(protocolFeeBaseUnits),
      netUsdc: fromUsdcBaseUnits(withdrawBaseUnits),
      protocolExecutionKind: settlement.protocolExecutionKind ?? "settlement_credit",
      protocolChargeId: settlement.protocolChargeId ?? null,
      destinationWallet: treasuryAccount.payoutWallet,
    },
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Created settlement sweep operation",
    category: "treasury",
    status: "ok",
    target: settlement.batchRef,
    detail: "Settlement sweep is waiting for treasury signatures.",
    metadata: {
      settlementId: settlement._id.toString(),
      treasuryOperationId: operation._id.toString(),
      threshold: treasuryAccount.threshold,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toTreasuryOperationResponse(operation);
}

export async function addTreasuryOwner(input: {
  merchantId: string;
  actor: string;
  payload: AddTreasuryOwnerInput;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "adding treasury Safe owners",
    input.payload.environment
  );

  const [treasuryAccount, member, signerBinding] = await Promise.all([
    ensureTreasuryAccount(input.merchantId, input.payload.environment),
    getTeamMemberOrThrow(input.merchantId, input.payload.teamMemberId),
    findTreasurySignerBinding({
      merchantId: input.merchantId,
      teamMemberId: input.payload.teamMemberId,
    }),
  ]);

  if (member.status !== "active") {
    throw new HttpError(409, "Team member must be active before becoming a treasury owner.");
  }

  if (!signerBinding || signerBinding.status !== "active") {
    throw new HttpError(
      409,
      "Team member must have an active verified treasury signer wallet."
    );
  }

  const ownerWallet = normalizeAddress(signerBinding.walletAddress);

  if (treasuryAccount.ownerAddresses.includes(ownerWallet)) {
    throw new HttpError(409, "This signer is already an owner of the treasury Safe.");
  }

  const nextOwnerCount = treasuryAccount.ownerAddresses.length + 1;
  const threshold = input.payload.threshold ?? treasuryAccount.threshold;

  if (threshold < 1 || threshold > nextOwnerCount) {
    throw new HttpError(409, "Threshold cannot exceed the Safe owner count.");
  }

  const provider = createSafeProvider(input.payload.environment);
  const draft = await provider.buildAddOwnerTransaction({
    safeAddress: treasuryAccount.safeAddress,
    ownerAddress: ownerWallet,
    threshold,
  });

  return createSafeGovernanceOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.payload.environment,
    kind: "safe_owner_add",
    targetTeamMemberId: input.payload.teamMemberId,
    draft,
    metadata: {
      teamMemberId: input.payload.teamMemberId,
      teamMemberName: member.name,
      teamMemberEmail: member.email,
      walletAddress: ownerWallet,
      nextThreshold: threshold,
    },
  });
}

export async function removeTreasuryOwner(input: {
  merchantId: string;
  teamMemberId: string;
  actor: string;
  payload: RemoveTreasuryOwnerInput;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "removing treasury Safe owners",
    input.payload.environment
  );

  const [treasuryAccount, member, signerBinding] = await Promise.all([
    ensureTreasuryAccount(input.merchantId, input.payload.environment),
    getTeamMemberOrThrow(input.merchantId, input.teamMemberId),
    findTreasurySignerBinding({
      merchantId: input.merchantId,
      teamMemberId: input.teamMemberId,
    }),
  ]);

  if (!signerBinding) {
    throw new HttpError(404, "Treasury signer binding was not found for this team member.");
  }

  const ownerWallet = normalizeAddress(signerBinding.walletAddress);

  if (!treasuryAccount.ownerAddresses.includes(ownerWallet)) {
    throw new HttpError(409, "This team member is not an owner of the treasury Safe.");
  }

  const nextOwnerCount = treasuryAccount.ownerAddresses.length - 1;

  if (nextOwnerCount < 1) {
    throw new HttpError(409, "Treasury Safe must keep at least one owner.");
  }

  const threshold =
    input.payload.threshold ?? Math.min(treasuryAccount.threshold, nextOwnerCount);

  if (threshold < 1 || threshold > nextOwnerCount) {
    throw new HttpError(409, "Threshold cannot exceed the remaining owner count.");
  }

  const provider = createSafeProvider(input.payload.environment);
  const draft = await provider.buildRemoveOwnerTransaction({
    safeAddress: treasuryAccount.safeAddress,
    ownerAddress: ownerWallet,
    threshold,
  });

  return createSafeGovernanceOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.payload.environment,
    kind: "safe_owner_remove",
    targetTeamMemberId: input.teamMemberId,
    draft,
    metadata: {
      teamMemberId: input.teamMemberId,
      teamMemberName: member.name,
      teamMemberEmail: member.email,
      walletAddress: ownerWallet,
      nextThreshold: threshold,
    },
  });
}

export async function updateTreasuryThreshold(input: {
  merchantId: string;
  actor: string;
  payload: UpdateTreasuryThresholdInput;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "changing treasury Safe threshold",
    input.payload.environment
  );

  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.payload.environment
  );

  if (
    input.payload.threshold < 1 ||
    input.payload.threshold > treasuryAccount.ownerAddresses.length
  ) {
    throw new HttpError(409, "Threshold cannot exceed the Safe owner count.");
  }

  if (input.payload.threshold === treasuryAccount.threshold) {
    throw new HttpError(409, "Treasury threshold is already set to this value.");
  }

  const provider = createSafeProvider(input.payload.environment);
  const draft = await provider.buildChangeThresholdTransaction({
    safeAddress: treasuryAccount.safeAddress,
    threshold: input.payload.threshold,
  });

  return createSafeGovernanceOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.payload.environment,
    kind: "safe_threshold_change",
    draft,
    metadata: {
      previousThreshold: treasuryAccount.threshold,
      nextThreshold: input.payload.threshold,
    },
  });
}

async function createWalletOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  kind: string;
  targetAddress: string;
  data: string;
  metadata?: Record<string, unknown>;
}) {
  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );
  const existingOperation = await TreasuryOperationModel.findOne({
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
    kind: input.kind,
    targetAddress: normalizeAddress(input.targetAddress),
    data: input.data,
    status: {
      $in: ["pending_signatures", "approved"],
    },
  }).exec();

  if (existingOperation) {
    return toTreasuryOperationResponse(existingOperation);
  }

  const operation = await TreasuryOperationModel.create({
    merchantId: new Types.ObjectId(input.merchantId),
    environment: input.environment,
    treasuryAccountId: treasuryAccount._id,
    settlementId: null,
    kind: input.kind,
    status: "pending_signatures",
    safeAddress: treasuryAccount.safeAddress,
    safeTxHash: null,
    safeNonce: null,
    threshold: treasuryAccount.threshold,
    targetAddress: normalizeAddress(input.targetAddress),
    value: "0",
    data: input.data,
    origin: `settings:${input.kind}`,
    createdBy: input.actor,
    signatures: [],
    metadata: input.metadata ?? {},
  });

  return toTreasuryOperationResponse(operation);
}

export async function queueMerchantRegistrationOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  const [merchant, treasuryAccount] = await Promise.all([
    getMerchantOrThrow(input.merchantId),
    ensureTreasuryAccount(input.merchantId, input.environment),
  ]);

  if (!merchant.reserveWallet) {
    return null;
  }

  if (
    await isProtocolMerchantRegistered(
      input.environment,
      treasuryAccount.safeAddress
    )
  ) {
    return null;
  }

  const existingOperation = await TreasuryOperationModel.findOne({
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
    kind: "merchant_register",
    status: { $in: ["pending_signatures", "approved"] },
  }).exec();

  if (existingOperation) {
    return toTreasuryOperationResponse(existingOperation);
  }

  return createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: "merchant_register",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: encodeMerchantRegisterCall({
      payoutWallet: merchant.payoutWallet,
      reserveWallet: merchant.reserveWallet,
      metadataHash: merchant.metadataHash,
    }),
    metadata: {
      entityType: "merchant",
      payoutWallet: merchant.payoutWallet,
      reserveWallet: merchant.reserveWallet,
      metadataHash: merchant.metadataHash,
    },
  });
}

async function ensureProtocolMerchantReady(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  try {
    const treasuryAccount = await ensureTreasuryAccount(
      input.merchantId,
      input.environment
    );
    const merchantRegistered = await isProtocolMerchantRegistered(
      input.environment,
      treasuryAccount.safeAddress
    );

    if (merchantRegistered) {
      return {
        ready: true as const,
        treasuryAccount,
        registrationOperation: null,
      };
    }

    return {
      ready: false as const,
      treasuryAccount,
      registrationOperation: await queueMerchantRegistrationOperation(input),
    };
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 409) {
      return {
        ready: false as const,
        treasuryAccount: null,
        registrationOperation: null,
      };
    }

    throw error;
  }
}

async function queueMerchantSubscriptionOperatorAuthorization(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );

  if (
    !(await isProtocolMerchantRegistered(
      input.environment,
      treasuryAccount.safeAddress
    ))
  ) {
    return null;
  }

  const operatorAddress = normalizeAddress(
    getRenewSubscriptionOperatorAddress(input.environment)
  );
  const alreadyAuthorized = await isMerchantSubscriptionOperatorAuthorized({
    environment: input.environment,
    merchantAddress: treasuryAccount.safeAddress,
    operatorAddress,
  });

  if (alreadyAuthorized) {
    return null;
  }

  const existingOperation = await TreasuryOperationModel.findOne({
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
    kind: "subscription_operator_authorize",
    status: { $in: ["pending_signatures", "approved"] },
    "metadata.operatorAddress": operatorAddress,
  }).exec();

  if (existingOperation) {
    return toTreasuryOperationResponse(existingOperation);
  }

  return createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: "subscription_operator_authorize",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: encodeSetSubscriptionOperatorCall({
      operator: operatorAddress,
      enabled: true,
    }),
    metadata: {
      entityType: "merchant",
      operatorAddress,
      enabled: true,
    },
  });
}

export async function ensureMerchantSubscriptionOperatorReady(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  const readiness = await ensureProtocolMerchantReady(input);

  if (!readiness.treasuryAccount) {
    return {
      ready: false as const,
      merchantReady: false as const,
      treasuryAccount: null,
      registrationOperation: readiness.registrationOperation,
      operatorAuthorizationOperation: null,
      operatorAddress: null,
    };
  }

  if (!readiness.ready) {
    return {
      ready: false as const,
      merchantReady: false as const,
      treasuryAccount: readiness.treasuryAccount,
      registrationOperation: readiness.registrationOperation,
      operatorAuthorizationOperation: null,
      operatorAddress: null,
    };
  }

  const operatorAddress = normalizeAddress(
    getRenewSubscriptionOperatorAddress(input.environment)
  );
  const operatorAuthorized = await isMerchantSubscriptionOperatorAuthorized({
    environment: input.environment,
    merchantAddress: readiness.treasuryAccount.safeAddress,
    operatorAddress,
  });

  if (operatorAuthorized) {
    return {
      ready: true as const,
      merchantReady: true as const,
      treasuryAccount: readiness.treasuryAccount,
      registrationOperation: null,
      operatorAuthorizationOperation: null,
      operatorAddress,
    };
  }

  return {
    ready: false as const,
    merchantReady: true as const,
    treasuryAccount: readiness.treasuryAccount,
    registrationOperation: null,
    operatorAuthorizationOperation:
      await queueMerchantSubscriptionOperatorAuthorization(input),
    operatorAddress,
  };
}

export async function queuePlanProtocolSync(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  planId: string;
}) {
  const plan = await PlanModel.findOne({
    _id: input.planId,
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
  }).exec();

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  const targetStatus = (plan.pendingStatus ?? plan.status).trim();

  if (!plan.protocolPlanId && targetStatus !== "active") {
    plan.protocolSyncStatus = "not_synced";
    plan.protocolOperationId = null;
    plan.protocolTxHash = null;
    await plan.save();
    return null;
  }

  const readiness = await ensureProtocolMerchantReady({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  if (!readiness.treasuryAccount) {
    plan.protocolSyncStatus = "not_configured";
    plan.protocolOperationId = null;
    plan.protocolTxHash = null;
    await plan.save();
    return null;
  }

  if (!readiness.ready) {
    plan.protocolSyncStatus = "blocked_merchant_registration";
    plan.protocolOperationId = null;
    plan.protocolTxHash = null;
    await plan.save();
    return readiness.registrationOperation;
  }

  await queueMerchantSubscriptionOperatorAuthorization({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
  }).catch(() => null);

  const maxRetryCount = await getMerchantMaxRetryCount(input.merchantId);
  const operation = await createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: plan.protocolPlanId ? "plan_update" : "plan_create",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: plan.protocolPlanId
      ? encodePlanUpdateCall({
        protocolPlanId: plan.protocolPlanId,
        usdAmount: plan.usdAmount,
        billingIntervalDays: plan.billingIntervalDays,
        trialDays: plan.trialDays,
        retryWindowHours: plan.retryWindowHours,
        maxRetryCount,
        billingMode: plan.billingMode,
        usageRate: plan.usageRate ?? null,
        active: targetStatus === "active",
      })
      : encodePlanCreateCall({
        planCode: plan.planCode,
        usdAmount: plan.usdAmount,
        billingIntervalDays: plan.billingIntervalDays,
        trialDays: plan.trialDays,
        retryWindowHours: plan.retryWindowHours,
        maxRetryCount,
        billingMode: plan.billingMode,
        usageRate: plan.usageRate ?? null,
      }),
    metadata: {
      entityType: "plan",
      planId: plan._id.toString(),
      status: plan.status,
      targetStatus,
      maxRetryCount,
    },
  });

  plan.protocolOperationId = new Types.ObjectId(operation.id);
  plan.protocolSyncStatus =
    targetStatus === "active" && plan.status !== "active"
      ? "pending_activation"
      : targetStatus === "archived" && plan.status !== "archived"
        ? "pending_archive"
        : operation.status;
  plan.protocolTxHash = operation.txHash ?? null;
  await plan.save();

  return operation;
}

export async function queueSubscriptionProtocolCreate(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
  checkoutSessionId?: string;
  triggerInitialCharge?: boolean;
}) {
  const subscription = await SubscriptionModel.findOne({
    _id: input.subscriptionId,
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
  }).exec();

  if (!subscription) {
    throw new HttpError(404, "Subscription was not found.");
  }

  if (subscription.status !== "pending_activation" && subscription.status !== "active") {
    subscription.protocolSyncStatus = "not_synced";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  const plan = await PlanModel.findOne({
    _id: subscription.planId,
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
  }).exec();

  if (!plan) {
    throw new HttpError(404, "Plan was not found.");
  }

  if (!plan.protocolPlanId || plan.protocolSyncStatus !== "synced" || plan.status !== "active") {
    await queuePlanProtocolSync({
      merchantId: input.merchantId,
      actor: input.actor,
      environment: input.environment,
      planId: plan._id.toString(),
    });
    subscription.protocolSyncStatus = "blocked_plan_sync";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  const readiness = await ensureMerchantSubscriptionOperatorReady({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  if (!readiness.treasuryAccount) {
    subscription.protocolSyncStatus = "not_configured";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  if (!readiness.ready) {
    subscription.protocolSyncStatus = readiness.merchantReady
      ? "blocked_operator_authorization"
      : "blocked_merchant_registration";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  const mandateHash = deriveProtocolMandateHash({
    customerRef: subscription.customerRef,
    paymentAccountType: subscription.paymentAccountType,
    paymentAccountNumber: subscription.paymentAccountNumber ?? null,
    paymentNetworkId: subscription.paymentNetworkId ?? null,
  });

  const createdOnchain = await createProtocolSubscriptionForMerchant({
    environment: input.environment,
    merchantAddress: readiness.treasuryAccount.safeAddress,
    protocolPlanId: plan.protocolPlanId,
    customerRef: subscription.customerRef,
    billingCurrency: subscription.billingCurrency,
    nextChargeAt: subscription.nextChargeAt,
    localAmount: subscription.localAmount,
    mandateHash,
  });

  if (!createdOnchain.protocolSubscriptionId) {
    throw new HttpError(
      502,
      "Protocol subscription creation completed without a subscription id."
    );
  }

  subscription.protocolSubscriptionId = createdOnchain.protocolSubscriptionId;
  subscription.protocolOperationId = null;
  subscription.status = "active";
  subscription.pendingStatus = null;
  subscription.protocolSyncStatus = "synced";
  subscription.protocolTxHash = createdOnchain.txHash;
  await subscription.save();

  if (input.triggerInitialCharge === true) {
    const { runSubscriptionChargeJob } = await import(
      "@/features/charges/charge.service"
    );
    const chargeResult = await runSubscriptionChargeJob({
      subscriptionId: subscription._id.toString(),
    });

    if (input.checkoutSessionId) {
      await syncCheckoutSessionWithChargeResult({
        checkoutSessionId: input.checkoutSessionId,
        billingCurrency: subscription.billingCurrency,
        chargeResult,
      });
    }
  }

  return {
    protocolSubscriptionId: createdOnchain.protocolSubscriptionId,
    txHash: createdOnchain.txHash,
  };
}

async function queueSubscriptionProtocolOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
  kind:
  | "subscription_pause"
  | "subscription_resume"
  | "subscription_cancel"
  | "subscription_mandate_update";
}) {
  const subscription = await SubscriptionModel.findOne({
    _id: input.subscriptionId,
    merchantId: input.merchantId,
    ...createRuntimeModeCondition("environment", input.environment),
  }).exec();

  if (!subscription) {
    throw new HttpError(404, "Subscription was not found.");
  }

  if (!subscription.protocolSubscriptionId) {
    return queueSubscriptionProtocolCreate({
      merchantId: input.merchantId,
      actor: input.actor,
      environment: input.environment,
      subscriptionId: input.subscriptionId,
    });
  }

  const readiness = await ensureMerchantSubscriptionOperatorReady({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  if (!readiness.treasuryAccount) {
    subscription.protocolSyncStatus = "not_configured";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  if (!readiness.ready) {
    subscription.protocolSyncStatus = readiness.merchantReady
      ? "blocked_operator_authorization"
      : "blocked_merchant_registration";
    subscription.protocolOperationId = null;
    subscription.protocolTxHash = null;
    await subscription.save();
    return null;
  }

  const mandateHash = deriveProtocolMandateHash({
    customerRef: subscription.customerRef,
    paymentAccountType: subscription.paymentAccountType,
    paymentAccountNumber: subscription.paymentAccountNumber ?? null,
    paymentNetworkId: subscription.paymentNetworkId ?? null,
  });
  const execution =
    input.kind === "subscription_pause"
      ? await pauseProtocolSubscription({
        environment: input.environment,
        merchantAddress: readiness.treasuryAccount.safeAddress,
        protocolSubscriptionId: subscription.protocolSubscriptionId,
      })
      : input.kind === "subscription_resume"
        ? await resumeProtocolSubscription({
          environment: input.environment,
          merchantAddress: readiness.treasuryAccount.safeAddress,
          protocolSubscriptionId: subscription.protocolSubscriptionId,
          nextChargeAt: subscription.nextChargeAt,
        })
        : input.kind === "subscription_cancel"
          ? await cancelProtocolSubscription({
            environment: input.environment,
            merchantAddress: readiness.treasuryAccount.safeAddress,
            protocolSubscriptionId: subscription.protocolSubscriptionId,
          })
          : await updateProtocolSubscriptionMandate({
            environment: input.environment,
            merchantAddress: readiness.treasuryAccount.safeAddress,
            protocolSubscriptionId: subscription.protocolSubscriptionId,
            mandateHash,
          });

  subscription.protocolOperationId = null;
  subscription.protocolSyncStatus = "synced";
  subscription.protocolTxHash = execution.txHash;

  if (input.kind === "subscription_pause") {
    subscription.status = "paused";
    subscription.pendingStatus = null;
  } else if (input.kind === "subscription_resume") {
    subscription.status = "active";
    subscription.pendingStatus = null;
  } else if (input.kind === "subscription_cancel") {
    subscription.status = "cancelled";
    subscription.pendingStatus = null;
  } else {
    subscription.pendingStatus = null;
  }

  await subscription.save();

  return execution;
}

export async function queueSubscriptionProtocolPause(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
}) {
  return queueSubscriptionProtocolOperation({
    ...input,
    kind: "subscription_pause",
  });
}

export async function queueSubscriptionProtocolResume(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
}) {
  return queueSubscriptionProtocolOperation({
    ...input,
    kind: "subscription_resume",
  });
}

export async function queueSubscriptionProtocolCancel(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
}) {
  return queueSubscriptionProtocolOperation({
    ...input,
    kind: "subscription_cancel",
  });
}

export async function queueSubscriptionProtocolMandateUpdate(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  subscriptionId: string;
}) {
  return queueSubscriptionProtocolOperation({
    ...input,
    kind: "subscription_mandate_update",
  });
}

async function createSafeGovernanceOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  kind: "safe_owner_add" | "safe_owner_remove" | "safe_threshold_change";
  targetTeamMemberId?: string;
  draft: {
    safeAddress: string;
    targetAddress: string;
    value: string;
    data: string;
  };
  metadata: Record<string, unknown>;
}) {
  const operation = await createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: input.kind,
    targetAddress: input.draft.targetAddress,
    data: input.draft.data,
    metadata: input.metadata,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Queued treasury Safe governance operation",
    category: "treasury",
    status: "ok",
    target: input.kind,
    detail: `Safe governance change ${input.kind} is waiting for approvals.`,
    metadata: {
      ...input.metadata,
      targetTeamMemberId: input.targetTeamMemberId ?? null,
      safeAddress: input.draft.safeAddress,
    },
    ipAddress: null,
    userAgent: null,
  });

  return operation;
}

export async function createWalletUpdateOperations(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
  primaryWallet: string;
  reserveWallet: string | null;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "updating treasury payout wallets",
    input.environment
  );

  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );
  const protocolAddress = getSafeConfig(input.environment).protocolAddress;
  const operations: ReturnType<typeof toTreasuryOperationResponse>[] = [];

  const nextPrimaryWallet = normalizeAddress(input.primaryWallet);
  const nextReserveWallet = input.reserveWallet
    ? normalizeAddress(input.reserveWallet)
    : null;

  if (nextPrimaryWallet !== treasuryAccount.payoutWallet) {
    operations.push(
      await createWalletOperation({
        merchantId: input.merchantId,
        actor: input.actor,
        environment: input.environment,
        kind: "payout_wallet_change_request",
        targetAddress: protocolAddress,
        data: encodePayoutWalletChangeRequestCall(nextPrimaryWallet),
        metadata: {
          nextWallet: nextPrimaryWallet,
        },
      })
    );
  }

  if (nextReserveWallet === null && treasuryAccount.reserveWallet) {
    operations.push(
      await createWalletOperation({
        merchantId: input.merchantId,
        actor: input.actor,
        environment: input.environment,
        kind: "reserve_wallet_clear",
        targetAddress: protocolAddress,
        data: encodeReserveWalletClearCall(),
      })
    );
  } else if (
    nextReserveWallet !== null &&
    nextReserveWallet !== treasuryAccount.reserveWallet
  ) {
    operations.push(
      await createWalletOperation({
        merchantId: input.merchantId,
        actor: input.actor,
        environment: input.environment,
        kind: "reserve_wallet_update",
        targetAddress: protocolAddress,
        data: encodeReserveWalletUpdateCall(nextReserveWallet),
        metadata: {
          reserveWallet: nextReserveWallet,
        },
      })
    );
  }

  if (operations.length === 0) {
    throw new HttpError(409, "No treasury wallet changes are pending.");
  }

  return operations;
}

export async function createReservePromoteOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "promoting the reserve payout wallet",
    input.environment
  );

  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );

  if (!treasuryAccount.reserveWallet) {
    throw new HttpError(409, "Reserve wallet is not configured.");
  }

  return createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: "reserve_wallet_promote",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: encodeReserveWalletPromoteCall(),
  });
}

export async function createReserveClearOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "removing the reserve payout wallet",
    input.environment
  );

  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );

  if (!treasuryAccount.reserveWallet) {
    throw new HttpError(409, "Reserve wallet is not configured.");
  }

  return createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: "reserve_wallet_clear",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: encodeReserveWalletClearCall(),
  });
}

export async function createPayoutWalletConfirmOperation(input: {
  merchantId: string;
  actor: string;
  environment: RuntimeMode;
}) {
  await assertMerchantKybApprovedForLive(
    input.merchantId,
    "confirming the payout wallet change",
    input.environment
  );

  const treasuryAccount = await ensureTreasuryAccount(
    input.merchantId,
    input.environment
  );

  if (!treasuryAccount.pendingPayoutWallet || !treasuryAccount.payoutWalletChangeReadyAt) {
    throw new HttpError(409, "No payout wallet change is pending confirmation.");
  }

  if (treasuryAccount.payoutWalletChangeReadyAt > new Date()) {
    throw new HttpError(
      409,
      "Payout wallet change delay has not elapsed yet."
    );
  }

  return createWalletOperation({
    merchantId: input.merchantId,
    actor: input.actor,
    environment: input.environment,
    kind: "payout_wallet_change_confirm",
    targetAddress: getSafeConfig(input.environment).protocolAddress,
    data: encodePayoutWalletChangeConfirmCall(),
    metadata: {
      nextWallet: treasuryAccount.pendingPayoutWallet,
    },
  });
}

export async function getTreasuryOperationSigningPayload(input: {
  merchantId: string;
  operationId: string;
  teamMemberId: string;
}) {
  const { operation, treasuryAccount } = await loadOperationWithTreasury(
    input.operationId,
    input.merchantId
  );

  requireTreasuryOperationStatus(operation.status);

  await ensureTreasurySignerMatchesSafe({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
    treasuryAccount,
  });

  const provider = createSafeProvider(
    toStoredRuntimeMode(treasuryAccount.environment)
  );
  const payload = await provider.buildTransactionSigningPayload({
    safeAddress: treasuryAccount.safeAddress,
    targetAddress: operation.targetAddress,
    value: operation.value,
    data: operation.data,
    safeNonce: operation.safeNonce ?? undefined,
  });

  if (!operation.safeTxHash) {
    operation.safeTxHash = payload.safeTxHash;
  }

  if (operation.safeNonce === null || operation.safeNonce === undefined) {
    operation.safeNonce = payload.safeNonce;
  }

  await operation.save();

  return {
    operation: toTreasuryOperationResponse(operation),
    signingPayload: payload,
  };
}

export async function approveTreasuryOperation(input: {
  merchantId: string;
  operationId: string;
  teamMemberId: string;
  actor: string;
  signature: string;
}) {
  const { operation, treasuryAccount } = await loadOperationWithTreasury(
    input.operationId,
    input.merchantId
  );

  requireTreasuryOperationStatus(operation.status);

  const { member, signerBinding } = await ensureTreasurySignerMatchesSafe({
    merchantId: input.merchantId,
    teamMemberId: input.teamMemberId,
    treasuryAccount,
  });

  const existingSignature = operation.signatures.find(
    (entry) => entry.teamMemberId === input.teamMemberId
  );

  if (existingSignature) {
    return toTreasuryOperationResponse(operation);
  }

  const provider = createSafeProvider(
    toStoredRuntimeMode(treasuryAccount.environment)
  );

  if (operation.signatures.length === 0) {
    const proposed = await provider.proposeTransaction({
      safeAddress: treasuryAccount.safeAddress,
      transactions: [
        {
          to: operation.targetAddress,
          value: operation.value,
          data: operation.data,
        },
      ],
      senderAddress: signerBinding.walletAddress,
      senderSignature: input.signature,
      origin: operation.origin,
      safeNonce: operation.safeNonce ?? undefined,
    });

    if (
      operation.safeTxHash &&
      normalizeAddress(proposed.safeTxHash) !== normalizeAddress(operation.safeTxHash)
    ) {
      throw new HttpError(
        409,
        "Safe transaction hash does not match the prepared approval payload."
      );
    }

    operation.safeTxHash = proposed.safeTxHash;
    operation.safeNonce = proposed.safeNonce;
    operation.threshold = proposed.threshold;
  } else {
    if (!operation.safeTxHash) {
      throw new HttpError(409, "Treasury operation is missing a Safe transaction hash.");
    }

    await provider.confirmTransaction({
      safeTxHash: operation.safeTxHash,
      signature: input.signature,
    });
  }

  operation.signatures.push({
    teamMemberId: input.teamMemberId,
    name: member.name,
    email: member.email,
    role: member.role,
    walletAddress: signerBinding.walletAddress,
    signature: input.signature,
    signedAt: new Date(),
  });
  operation.status =
    operation.signatures.length >= operation.threshold
      ? "approved"
      : "pending_signatures";
  await operation.save();
  await syncLinkedProtocolRecordState({
    operation,
    status: operation.status,
  });

  signerBinding.lastApprovedAt = new Date();
  await signerBinding.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Approved treasury operation",
    category: "treasury",
    status: "ok",
    target: operation.kind,
    detail: `${member.name} approved treasury operation ${operation.kind}.`,
    metadata: {
      operationId: operation._id.toString(),
      kind: operation.kind,
      approvedCount: operation.signatures.length,
      threshold: operation.threshold,
      safeTxHash: operation.safeTxHash,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toTreasuryOperationResponse(operation);
}

export async function rejectTreasuryOperation(input: {
  merchantId: string;
  operationId: string;
  actor: string;
  payload: RejectTreasuryOperationInput;
}) {
  const { operation } = await loadOperationWithTreasury(
    input.operationId,
    input.merchantId
  );

  requireTreasuryOperationStatus(operation.status);

  operation.status = "rejected";
  operation.rejectedBy = input.actor;
  operation.rejectionReason = input.payload.reason;
  operation.rejectedAt = new Date();
  await operation.save();
  await syncLinkedProtocolRecordState({
    operation,
    status: "rejected",
    txHash: null,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Rejected treasury operation",
    category: "treasury",
    status: "warning",
    target: operation.kind,
    detail: input.payload.reason,
    metadata: {
      operationId: operation._id.toString(),
      kind: operation.kind,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toTreasuryOperationResponse(operation);
}

export async function executeTreasuryOperation(input: {
  merchantId: string;
  operationId: string;
  actor: string;
}) {
  const { operation, treasuryAccount } = await loadOperationWithTreasury(
    input.operationId,
    input.merchantId
  );

  if (operation.status !== "approved") {
    throw new HttpError(
      409,
      "Treasury operation does not yet have the required approvals."
    );
  }

  if (operation.signatures.length < operation.threshold || !operation.safeTxHash) {
    throw new HttpError(
      409,
      "Treasury operation is missing Safe confirmations."
    );
  }

  const provider = createSafeProvider(
    toStoredRuntimeMode(treasuryAccount.environment)
  );
  const execution = await provider.executeTransaction({
    safeAddress: treasuryAccount.safeAddress,
    safeTxHash: operation.safeTxHash,
    safeNonce: operation.safeNonce ?? undefined,
    transactions: [
      {
        to: operation.targetAddress,
        value: operation.value,
        data: operation.data,
      },
    ],
    signatures: operation.signatures
      .map((entry) => ({
        signer: entry.walletAddress,
        signature: entry.signature,
      }))
      .sort((a, b) => {
        const addrA = a.signer.toLowerCase();
        const addrB = b.signer.toLowerCase();
        return addrA < addrB ? -1 : addrA > addrB ? 1 : 0;
      }),
  });

  operation.status = "executed";
  operation.txHash = execution.txHash;
  operation.executedAt = new Date();
  await operation.save();

  await applyExecutedOperationEffects({
    operation,
    treasuryAccount,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Executed treasury operation",
    category: "treasury",
    status: "ok",
    target: operation.kind,
    detail: `Treasury operation ${operation.kind} executed on-chain.`,
    metadata: {
      operationId: operation._id.toString(),
      safeTxHash: operation.safeTxHash,
      txHash: execution.txHash,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toTreasuryOperationResponse(operation);
}

export async function listTreasuryOperationsByMerchantId(
  merchantId: string,
  environment?: RuntimeMode
) {
  const query: Record<string, unknown> = { merchantId };

  if (environment) {
    Object.assign(query, createRuntimeModeCondition("environment", environment));
  }

  const operations = await TreasuryOperationModel.find(query)
    .sort({ createdAt: -1 })
    .exec();

  return operations.map(toTreasuryOperationResponse);
}

export async function listSettlementSweepOperations(input: {
  merchantId: string;
  limit: number;
  environment?: RuntimeMode;
  status?: string;
}) {
  const query: Record<string, unknown> = {
    merchantId: input.merchantId,
    kind: "settlement_sweep",
  };

  if (input.environment) {
    Object.assign(query, createRuntimeModeCondition("environment", input.environment));
  }

  if (input.status) {
    query.status = input.status;
  }

  const operations = await TreasuryOperationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(input.limit)
    .exec();

  return operations.map(toTreasuryOperationResponse);
}

export async function getSettlementSweepOperation(
  settlementId: string,
  merchantId: string,
  environment?: RuntimeMode
) {
  const operation = await TreasuryOperationModel.findOne({
    merchantId,
    settlementId,
    ...(environment
      ? createRuntimeModeCondition("environment", environment)
      : {}),
    kind: "settlement_sweep",
  }).exec();

  if (!operation) {
    throw new HttpError(404, "Settlement sweep operation was not found.");
  }

  return toTreasuryOperationResponse(operation);
}
