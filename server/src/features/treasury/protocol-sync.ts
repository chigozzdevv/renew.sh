import {
  BaseError,
  ContractFunctionRevertedError,
  createWalletClient,
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getProtocolRuntimeConfig } from "@/config/protocol.config";
import { getSafeConfig } from "@/config/safe.config";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import { HttpError } from "@/shared/errors/http-error";

const renewProtocolAbi = parseAbi([
  "error MerchantNotRegistered(address merchant)",
  "function getMerchant(address merchant) view returns ((address payoutWallet,address reserveWallet,address pendingPayoutWallet,bytes32 metadataHash,bool active,uint64 payoutWalletChangeReadyAt,uint64 createdAt))",
  "function setSubscriptionOperator(address operator,bool enabled)",
  "function subscriptionOperators(address merchant,address operator) view returns (bool)",
  "function registerMerchant(address payoutWallet,address reserveWallet,bytes32 metadataHash)",
  "function createPlan(bytes32 planCode,uint128 usdPrice,uint64 billingInterval,uint32 trialPeriod,uint32 retryWindow,uint8 maxRetryCount,uint8 billingMode,uint128 usageRate) returns (uint256)",
  "function updatePlan(uint256 planId,uint128 usdPrice,uint64 billingInterval,uint32 trialPeriod,uint32 retryWindow,uint8 maxRetryCount,uint8 billingMode,uint128 usageRate,bool active)",
  "function createSubscription(uint256 planId,bytes32 customerRef,bytes32 billingCurrency,uint64 firstChargeAt,uint128 localAmountSnapshot,bytes32 mandateHash) returns (uint256)",
  "function createSubscriptionForMerchant(address merchant,uint256 planId,bytes32 customerRef,bytes32 billingCurrency,uint64 firstChargeAt,uint128 localAmountSnapshot,bytes32 mandateHash) returns (uint256)",
  "function updateSubscriptionMandateHash(uint256 subscriptionId,bytes32 mandateHash)",
  "function pauseSubscription(uint256 subscriptionId)",
  "function resumeSubscription(uint256 subscriptionId,uint64 nextChargeAt)",
  "function cancelSubscription(uint256 subscriptionId)",
  "event MerchantRegistered(address indexed merchant,address indexed payoutWallet,address indexed reserveWallet,bytes32 metadataHash)",
  "event PlanCreated(uint256 indexed planId,address indexed merchant,bytes32 indexed planCode,uint128 usdPrice,uint64 billingInterval,uint8 billingMode)",
  "event SubscriptionCreated(uint256 indexed subscriptionId,address indexed merchant,uint256 indexed planId,bytes32 customerRef,uint64 nextChargeAt,bytes32 mandateHash)",
]);

function getProtocolClient(environment: RuntimeMode) {
  const protocolConfig = getProtocolRuntimeConfig(environment);

  return {
    address: getAddress(protocolConfig.protocolAddress),
    client: createPublicClient({
      transport: http(protocolConfig.rpcUrl),
    }),
  };
}

function toScaledIntegerString(amount: number, decimals: number) {
  const fixedAmount = amount.toFixed(decimals);
  const [wholePart, fractionPart = ""] = fixedAmount.split(".");

  return `${wholePart}${fractionPart.padEnd(decimals, "0")}`;
}

export function toProtocolAmountBaseUnits(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Protocol amount must be a finite, non-negative number.");
  }

  return BigInt(toScaledIntegerString(amount, 6));
}

export function toProtocolBytes32(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Protocol bytes32 values must not be empty.");
  }

  const bytes = Buffer.from(normalized, "utf8");

  if (bytes.length <= 32) {
    return `0x${bytes.toString("hex").padEnd(64, "0")}` as Hex;
  }

  return keccak256(stringToHex(normalized));
}

export function toProtocolBillingMode(value: string) {
  return value === "metered" ? 1 : 0;
}

export function toProtocolTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return 0n;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Protocol timestamps must be valid dates.");
  }

  return BigInt(Math.floor(date.getTime() / 1000));
}

export function deriveProtocolMandateHash(input: {
  customerRef: string;
  paymentAccountType?: string | null;
  paymentAccountNumber?: string | null;
  paymentNetworkId?: string | null;
}) {
  return keccak256(
    stringToHex(
      JSON.stringify({
        customerRef: input.customerRef.trim(),
        paymentAccountType: input.paymentAccountType?.trim().toLowerCase() ?? "bank",
        paymentAccountNumber: input.paymentAccountNumber?.trim() ?? null,
        paymentNetworkId: input.paymentNetworkId?.trim() ?? null,
      })
    )
  );
}

export function encodeMerchantRegisterCall(input: {
  payoutWallet: string;
  reserveWallet: string;
  metadataHash: string;
}) {
  const normalizedMetadataHash = input.metadataHash.trim();
  const metadataHash =
    /^0x[0-9a-fA-F]{64}$/.test(normalizedMetadataHash)
      ? (normalizedMetadataHash as Hex)
      : toProtocolBytes32(normalizedMetadataHash || "renew-merchant");

  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "registerMerchant",
    args: [
      getAddress(input.payoutWallet),
      getAddress(input.reserveWallet),
      metadataHash,
    ],
  });
}

export function encodeSetSubscriptionOperatorCall(input: {
  operator: string;
  enabled: boolean;
}) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "setSubscriptionOperator",
    args: [getAddress(input.operator), input.enabled],
  });
}

export function encodePlanCreateCall(input: {
  planCode: string;
  usdAmount: number;
  billingIntervalDays: number;
  trialDays: number;
  retryWindowHours: number;
  maxRetryCount: number;
  billingMode: string;
  usageRate?: number | null;
}) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "createPlan",
    args: [
      toProtocolBytes32(input.planCode),
      toProtocolAmountBaseUnits(input.usdAmount),
      BigInt(input.billingIntervalDays * 24 * 60 * 60),
      input.trialDays * 24 * 60 * 60,
      input.retryWindowHours * 60 * 60,
      input.maxRetryCount,
      toProtocolBillingMode(input.billingMode),
      toProtocolAmountBaseUnits(input.usageRate ?? 0),
    ],
  });
}

export function encodePlanUpdateCall(input: {
  protocolPlanId: string;
  usdAmount: number;
  billingIntervalDays: number;
  trialDays: number;
  retryWindowHours: number;
  maxRetryCount: number;
  billingMode: string;
  usageRate?: number | null;
  active: boolean;
}) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "updatePlan",
    args: [
      BigInt(input.protocolPlanId),
      toProtocolAmountBaseUnits(input.usdAmount),
      BigInt(input.billingIntervalDays * 24 * 60 * 60),
      input.trialDays * 24 * 60 * 60,
      input.retryWindowHours * 60 * 60,
      input.maxRetryCount,
      toProtocolBillingMode(input.billingMode),
      toProtocolAmountBaseUnits(input.usageRate ?? 0),
      input.active,
    ],
  });
}

export function encodeSubscriptionCreateCall(input: {
  protocolPlanId: string;
  customerRef: string;
  billingCurrency: string;
  nextChargeAt: Date | string;
  localAmount: number;
  mandateHash: Hex;
}) {
  const firstChargeAt = toProtocolTimestamp(input.nextChargeAt);

  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "createSubscription",
    args: [
      BigInt(input.protocolPlanId),
      toProtocolBytes32(input.customerRef),
      toProtocolBytes32(input.billingCurrency),
      firstChargeAt > BigInt(Math.floor(Date.now() / 1000)) ? firstChargeAt : 0n,
      toProtocolAmountBaseUnits(input.localAmount),
      input.mandateHash,
    ],
  });
}

export function encodeSubscriptionCreateForMerchantCall(input: {
  merchantAddress: string;
  protocolPlanId: string;
  customerRef: string;
  billingCurrency: string;
  nextChargeAt: Date | string;
  localAmount: number;
  mandateHash: Hex;
}) {
  const firstChargeAt = toProtocolTimestamp(input.nextChargeAt);

  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "createSubscriptionForMerchant",
    args: [
      getAddress(input.merchantAddress),
      BigInt(input.protocolPlanId),
      toProtocolBytes32(input.customerRef),
      toProtocolBytes32(input.billingCurrency),
      firstChargeAt > BigInt(Math.floor(Date.now() / 1000)) ? firstChargeAt : 0n,
      toProtocolAmountBaseUnits(input.localAmount),
      input.mandateHash,
    ],
  });
}

export function encodeSubscriptionMandateUpdateCall(input: {
  protocolSubscriptionId: string;
  mandateHash: Hex;
}) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "updateSubscriptionMandateHash",
    args: [BigInt(input.protocolSubscriptionId), input.mandateHash],
  });
}

export function encodeSubscriptionPauseCall(protocolSubscriptionId: string) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "pauseSubscription",
    args: [BigInt(protocolSubscriptionId)],
  });
}

export function encodeSubscriptionResumeCall(input: {
  protocolSubscriptionId: string;
  nextChargeAt: Date | string | null | undefined;
}) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "resumeSubscription",
    args: [BigInt(input.protocolSubscriptionId), toProtocolTimestamp(input.nextChargeAt)],
  });
}

export function encodeSubscriptionCancelCall(protocolSubscriptionId: string) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "cancelSubscription",
    args: [BigInt(protocolSubscriptionId)],
  });
}

export function getRenewSubscriptionOperatorAddress(environment: RuntimeMode) {
  const account = privateKeyToAccount(
    getSafeConfig(environment).executorPrivateKey as Hex
  );

  return getAddress(account.address);
}

export async function isMerchantSubscriptionOperatorAuthorized(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  operatorAddress?: string;
}) {
  const { address, client } = getProtocolClient(input.environment);

  return client.readContract({
    address,
    abi: renewProtocolAbi,
    functionName: "subscriptionOperators",
    args: [
      getAddress(input.merchantAddress),
      getAddress(input.operatorAddress ?? getRenewSubscriptionOperatorAddress(input.environment)),
    ],
  });
}

export async function isProtocolMerchantRegistered(
  environment: RuntimeMode,
  merchantAddress: string
) {
  const { address, client } = getProtocolClient(environment);

  try {
    await client.readContract({
      address,
      abi: renewProtocolAbi,
      functionName: "getMerchant",
      args: [getAddress(merchantAddress)],
    });

    return true;
  } catch (error) {
    if (error instanceof BaseError) {
      const revertError = error.walk(
        (candidate) => candidate instanceof ContractFunctionRevertedError
      );

      if (
        revertError instanceof ContractFunctionRevertedError &&
        (revertError.data?.errorName === "MerchantNotRegistered" ||
          revertError.signature === "0xa6af7ebe" ||
          revertError.shortMessage.includes("MerchantNotRegistered"))
      ) {
        return false;
      }
    }

    throw error;
  }
}

async function getTransactionReceipt(environment: RuntimeMode, txHash: string) {
  const { client } = getProtocolClient(environment);

  return client.getTransactionReceipt({
    hash: txHash as Hex,
  });
}

async function writeSubscriptionOperatorTransaction(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  functionName:
  | "createSubscriptionForMerchant"
  | "updateSubscriptionMandateHash"
  | "pauseSubscription"
  | "resumeSubscription"
  | "cancelSubscription";
  args: readonly unknown[];
}) {
  const protocolConfig = getProtocolRuntimeConfig(input.environment);
  const operatorAccount = privateKeyToAccount(
    getSafeConfig(input.environment).executorPrivateKey as Hex
  );
  const { address, client } = getProtocolClient(input.environment);
  const walletClient = createWalletClient({
    account: operatorAccount,
    transport: http(protocolConfig.rpcUrl),
  });

  const authorized = await isMerchantSubscriptionOperatorAuthorized({
    environment: input.environment,
    merchantAddress: input.merchantAddress,
    operatorAddress: operatorAccount.address,
  });

  if (!authorized) {
    throw new HttpError(
      409,
      "Merchant has not approved the Renew subscription operator yet."
    );
  }

  const txHash = await walletClient.writeContract({
    address,
    abi: renewProtocolAbi,
    functionName: input.functionName,
    args: input.args as never,
    chain: undefined,
  });
  await client.waitForTransactionReceipt({ hash: txHash });

  return txHash.toLowerCase();
}

export async function createProtocolSubscriptionForMerchant(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  protocolPlanId: string;
  customerRef: string;
  billingCurrency: string;
  nextChargeAt: Date | string;
  localAmount: number;
  mandateHash: Hex;
}) {
  const firstChargeAt = toProtocolTimestamp(input.nextChargeAt);
  const txHash = await writeSubscriptionOperatorTransaction({
    environment: input.environment,
    merchantAddress: input.merchantAddress,
    functionName: "createSubscriptionForMerchant",
    args: [
      getAddress(input.merchantAddress),
      BigInt(input.protocolPlanId),
      toProtocolBytes32(input.customerRef),
      toProtocolBytes32(input.billingCurrency),
      firstChargeAt > BigInt(Math.floor(Date.now() / 1000)) ? firstChargeAt : 0n,
      toProtocolAmountBaseUnits(input.localAmount),
      input.mandateHash,
    ],
  });

  return {
    protocolSubscriptionId: await extractSubscriptionIdFromTransaction(
      input.environment,
      txHash
    ),
    txHash: txHash.toLowerCase(),
  };
}

export async function updateProtocolSubscriptionMandate(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  protocolSubscriptionId: string;
  mandateHash: Hex;
}) {
  return {
    txHash: await writeSubscriptionOperatorTransaction({
      environment: input.environment,
      merchantAddress: input.merchantAddress,
      functionName: "updateSubscriptionMandateHash",
      args: [BigInt(input.protocolSubscriptionId), input.mandateHash],
    }),
  };
}

export async function pauseProtocolSubscription(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  protocolSubscriptionId: string;
}) {
  return {
    txHash: await writeSubscriptionOperatorTransaction({
      environment: input.environment,
      merchantAddress: input.merchantAddress,
      functionName: "pauseSubscription",
      args: [BigInt(input.protocolSubscriptionId)],
    }),
  };
}

export async function resumeProtocolSubscription(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  protocolSubscriptionId: string;
  nextChargeAt: Date | string | null | undefined;
}) {
  return {
    txHash: await writeSubscriptionOperatorTransaction({
      environment: input.environment,
      merchantAddress: input.merchantAddress,
      functionName: "resumeSubscription",
      args: [BigInt(input.protocolSubscriptionId), toProtocolTimestamp(input.nextChargeAt)],
    }),
  };
}

export async function cancelProtocolSubscription(input: {
  environment: RuntimeMode;
  merchantAddress: string;
  protocolSubscriptionId: string;
}) {
  return {
    txHash: await writeSubscriptionOperatorTransaction({
      environment: input.environment,
      merchantAddress: input.merchantAddress,
      functionName: "cancelSubscription",
      args: [BigInt(input.protocolSubscriptionId)],
    }),
  };
}

export async function extractPlanIdFromTransaction(
  environment: RuntimeMode,
  txHash: string
) {
  const receipt = await getTransactionReceipt(environment, txHash);

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: renewProtocolAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "PlanCreated") {
        return decoded.args.planId.toString();
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function extractSubscriptionIdFromTransaction(
  environment: RuntimeMode,
  txHash: string
) {
  const receipt = await getTransactionReceipt(environment, txHash);

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: renewProtocolAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "SubscriptionCreated") {
        return decoded.args.subscriptionId.toString();
      }
    } catch {
      continue;
    }
  }

  return null;
}
