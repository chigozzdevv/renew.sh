import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getCctpConfig } from "@/config/cctp.config";
import { getProtocolRuntimeConfig } from "@/config/protocol.config";
import { env } from "@/config/env.config";
import { HttpError } from "@/shared/errors/http-error";

const erc20Abi = parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
]);

const tokenMessengerAbi = parseAbi([
  "function depositForBurn(uint256 amount,uint32 destinationDomain,bytes32 mintRecipient,address burnToken,bytes32 destinationCaller,uint256 maxFee,uint32 minFinalityThreshold) returns (uint64 nonce)",
]);

const messageTransmitterAbi = parseAbi([
  "function receiveMessage(bytes message,bytes attestation) returns (bool)",
]);

const renewProtocolAbi = parseAbi([
  "function creditSettlement(address merchant,bytes32 externalChargeId,address settlementSource,uint128 usdcAmount) returns (uint256)",
  "function executeCharge(uint256 subscriptionId,bytes32 externalChargeId,address settlementSource,uint128 localAmount,uint128 fxRate,uint128 usageUnits,uint128 usdcAmount) returns (uint256)",
  "function recordFailedCharge(uint256 subscriptionId,bytes32 externalChargeId,bytes32 failureCode) returns (uint256)",
  "function chargeOperators(address operator) view returns (bool)",
  "event ChargeExecuted(uint256 indexed chargeId,uint256 indexed subscriptionId,address indexed merchant,bytes32 externalChargeId,uint128 usdcAmount,uint128 feeAmount,uint128 usageUnits,uint64 billingPeriodAt,uint64 nextChargeAt)",
  "event ChargeFailed(uint256 indexed chargeId,uint256 indexed subscriptionId,address indexed merchant,bytes32 externalChargeId,bytes32 failureCode,uint8 retryCount,uint64 retryAvailableAt)",
  "event SettlementCredited(uint256 indexed chargeId,address indexed merchant,bytes32 indexed externalChargeId,address settlementSource,uint128 usdcAmount,uint128 feeAmount)",
]);

const SIX_DECIMAL_SCALE = 1_000_000n;
const ZERO_BYTES32 = `0x${"0".repeat(64)}` as Hex;
const FAST_FINALITY_THRESHOLD = 1_000;
const STANDARD_FINALITY_THRESHOLD = 2_000;
const FAST_TRANSFER_FEE_BUFFER_NUMERATOR = 120n;
const FAST_TRANSFER_FEE_BUFFER_DENOMINATOR = 100n;

type CircleAttestationResponse = {
  messages?: Array<{
    message?: string;
    attestation?: string;
    status?: string;
  }>;
};

type CircleTransferFee = {
  finalityThreshold?: number;
  minimumFee?: number;
};

type CircleFastTransferAllowance = {
  allowance?: number;
};

type BurnParameters = {
  maxFee: bigint;
  minFinalityThreshold: number;
  transferMode: "fast" | "standard";
  fastTransferFeeBps: number | null;
  fastTransferAllowanceUsdc: number | null;
  fallbackReason: string | null;
};

type ProtocolChargeExecutionInput =
  | {
      mode: "subscription_charge";
      externalChargeId: string;
      protocolSubscriptionId: string;
      localAmount: number;
      fxRate: number;
      usageUnits?: number;
      usdcAmount: number;
    }
  | {
      mode: "settlement_credit";
      merchantAddress: string;
      externalChargeId: string;
      amountUsdc: number;
    };

function logCctp(event: string, details: Record<string, unknown>) {
  console.log(
    `[cctp] ${event} ${JSON.stringify({
      ...details,
      timestamp: new Date().toISOString(),
    })}`
  );
}

function toUsdcBaseUnits(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "Settlement amount must be positive.");
  }

  return BigInt(Math.round(amount * Number(SIX_DECIMAL_SCALE)));
}

function addressToBytes32(address: Address) {
  return `0x${address.slice(2).padStart(64, "0")}` as Hex;
}

function formatBaseUnitsToUsdc(amount: bigint) {
  return Number(amount) / Number(SIX_DECIMAL_SCALE);
}

function toProtocolBytes32(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new HttpError(400, "Protocol bytes32 values must not be empty.");
  }

  const bytes = Buffer.from(normalized, "utf8");

  if (bytes.length <= 32) {
    return `0x${bytes.toString("hex").padEnd(64, "0")}` as Hex;
  }

  return keccak256(stringToHex(normalized));
}

function ceilDiv(dividend: bigint, divisor: bigint) {
  return (dividend + divisor - 1n) / divisor;
}

function toScaledBps(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new HttpError(502, "Circle returned an invalid transfer fee.");
  }

  return BigInt(Math.ceil(value * 10_000));
}

function calculateFeeFromBps(amount: bigint, minimumFeeBps: number) {
  const scaledBps = toScaledBps(minimumFeeBps);
  return ceilDiv(amount * scaledBps, 100_000_000n);
}

function toUsdcBaseUnitsFromFloat(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new HttpError(502, "Circle returned an invalid fast transfer allowance.");
  }

  return BigInt(Math.floor(amount * Number(SIX_DECIMAL_SCALE)));
}

async function fetchTransferFees(input: {
  attestationApiUrl: string;
  sourceDomain: number;
  destinationDomain: number;
}) {
  const response = await fetch(
    `${input.attestationApiUrl}/v2/burn/USDC/fees/${input.sourceDomain}/${input.destinationDomain}`
  );

  if (!response.ok) {
    throw new HttpError(
      502,
      `Circle fee quote request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as CircleTransferFee[];
}

async function fetchFastTransferAllowance(attestationApiUrl: string) {
  const response = await fetch(`${attestationApiUrl}/v2/fastBurn/USDC/allowance`);

  if (!response.ok) {
    throw new HttpError(
      502,
      `Circle fast transfer allowance request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as CircleFastTransferAllowance;
}

async function resolveBurnParameters(input: {
  attestationApiUrl: string;
  sourceDomain: number;
  destinationDomain: number;
  amount: bigint;
}): Promise<BurnParameters> {
  const fees = await fetchTransferFees(input);
  const fastTransferFee = fees.find(
    (entry) =>
      entry.finalityThreshold === FAST_FINALITY_THRESHOLD &&
      typeof entry.minimumFee === "number"
  );

  if (!fastTransferFee || typeof fastTransferFee.minimumFee !== "number") {
    return {
      maxFee: 0n,
      minFinalityThreshold: STANDARD_FINALITY_THRESHOLD,
      transferMode: "standard",
      fastTransferFeeBps: null,
      fastTransferAllowanceUsdc: null,
      fallbackReason: "fast_fee_quote_unavailable",
    };
  }

  try {
    const allowance = await fetchFastTransferAllowance(input.attestationApiUrl);
    const allowanceUsdc =
      typeof allowance.allowance === "number" ? allowance.allowance : null;

    if (
      typeof allowance.allowance === "number" &&
      toUsdcBaseUnitsFromFloat(allowance.allowance) < input.amount
    ) {
      return {
        maxFee: 0n,
        minFinalityThreshold: STANDARD_FINALITY_THRESHOLD,
        transferMode: "standard",
        fastTransferFeeBps: fastTransferFee.minimumFee,
        fastTransferAllowanceUsdc: allowanceUsdc,
        fallbackReason: "fast_allowance_too_low",
      };
    }

    const protocolFee = calculateFeeFromBps(input.amount, fastTransferFee.minimumFee);

    return {
      maxFee:
        protocolFee === 0n
          ? 0n
          : ceilDiv(
              protocolFee * FAST_TRANSFER_FEE_BUFFER_NUMERATOR,
              FAST_TRANSFER_FEE_BUFFER_DENOMINATOR
            ),
      minFinalityThreshold: FAST_FINALITY_THRESHOLD,
      transferMode: "fast",
      fastTransferFeeBps: fastTransferFee.minimumFee,
      fastTransferAllowanceUsdc: allowanceUsdc,
      fallbackReason: null,
    };
  } catch {
    const protocolFee = calculateFeeFromBps(input.amount, fastTransferFee.minimumFee);

    return {
      maxFee:
        protocolFee === 0n
          ? 0n
          : ceilDiv(
              protocolFee * FAST_TRANSFER_FEE_BUFFER_NUMERATOR,
              FAST_TRANSFER_FEE_BUFFER_DENOMINATOR
            ),
      minFinalityThreshold: FAST_FINALITY_THRESHOLD,
      transferMode: "fast",
      fastTransferFeeBps: fastTransferFee.minimumFee,
      fastTransferAllowanceUsdc: null,
      fallbackReason: "fast_allowance_endpoint_unavailable",
    };
  }
}

async function ensureNativeGas(
  label: string,
  client: ReturnType<typeof createPublicClient>,
  address: Address
) {
  const balance = await client.getBalance({ address });

  if (balance > 0n) {
    return;
  }

  throw new HttpError(
    409,
    `${label} has no gas balance. Fund ${address} before running settlement.`
  );
}

async function ensureContractDeployed(
  label: string,
  client: ReturnType<typeof createPublicClient>,
  address: Address
) {
  const code = await client.getCode({ address });

  if (!code || code === "0x") {
    throw new HttpError(
      500,
      `${label} is not deployed at ${address}. Check the configured CCTP contract addresses.`
    );
  }
}

async function fetchAttestation(input: {
  attestationApiUrl: string;
  sourceDomain: number;
  transactionHash: Hex;
  pollIntervalMs: number;
  timeoutMs: number;
  onStatusChange?: (status: string, elapsedMs: number) => void;
}) {
  const startedAt = Date.now();
  let lastKnownStatus = "pending";
  let lastLoggedStatus = "";

  while (Date.now() - startedAt < input.timeoutMs) {
    const response = await fetch(
      `${input.attestationApiUrl}/v2/messages/${input.sourceDomain}?transactionHash=${input.transactionHash}`
    );

    if (response.ok) {
      const payload = (await response.json()) as CircleAttestationResponse;
      lastKnownStatus =
        payload.messages?.find(
          (entry) =>
            typeof entry.status === "string" || entry.attestation === "PENDING"
        )?.status ??
        (payload.messages?.some((entry) => entry.attestation === "PENDING")
          ? "pending"
          : lastKnownStatus);
      if (lastKnownStatus !== lastLoggedStatus) {
        input.onStatusChange?.(lastKnownStatus, Date.now() - startedAt);
        lastLoggedStatus = lastKnownStatus;
      }
      const messageEntry = payload.messages?.find(
        (entry) =>
          typeof entry.message === "string" &&
          typeof entry.attestation === "string" &&
          entry.attestation !== "PENDING"
      );

      if (messageEntry?.message && messageEntry.attestation) {
        return {
          message: messageEntry.message as Hex,
          attestation: messageEntry.attestation as Hex,
        };
      }
    } else {
      let errorMessage = `http_${response.status}`;

      try {
        const payload = (await response.json()) as { error?: string; message?: string };
        errorMessage = payload.error ?? payload.message ?? errorMessage;
      } catch {
        // Fall back to the HTTP status label.
      }

      if (errorMessage !== lastLoggedStatus) {
        input.onStatusChange?.(errorMessage, Date.now() - startedAt);
        lastLoggedStatus = errorMessage;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, input.pollIntervalMs));
  }

  throw new HttpError(
    504,
    `Timed out waiting for Circle attestation for ${input.transactionHash} after ${Math.round(
      input.timeoutMs / 1000
    )}s (last status: ${lastKnownStatus}).`
  );
}

function extractProtocolChargeIdFromReceipt(logs: Array<{ data: Hex; topics: Hex[] }>) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: renewProtocolAbi,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });

      if (
        decoded.eventName === "ChargeExecuted" ||
        decoded.eventName === "ChargeFailed" ||
        decoded.eventName === "SettlementCredited"
      ) {
        return decoded.args.chargeId.toString();
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function bridgeSettlementToAvalanche(input: ProtocolChargeExecutionInput) {
  const mode = env.PAYMENT_ENV;
  const cctpConfig = getCctpConfig(mode).assertConfigured();
  const protocolConfig = getProtocolRuntimeConfig(mode);

  const sourceAccount = privateKeyToAccount(
    cctpConfig.sourcePrivateKey as Hex
  );
  const destinationAccount = privateKeyToAccount(
    (mode === "live"
      ? env.SAFE_EXECUTOR_PRIVATE_KEY_LIVE
      : env.SAFE_EXECUTOR_PRIVATE_KEY_TEST) as Hex
  );

  const sourceClient = createPublicClient({
    transport: http(cctpConfig.sourceRpcUrl),
  });
  const sourceWalletClient = createWalletClient({
    account: sourceAccount,
    transport: http(cctpConfig.sourceRpcUrl),
  });
  const destinationClient = createPublicClient({
    transport: http(protocolConfig.rpcUrl),
  });
  const destinationWalletClient = createWalletClient({
    account: destinationAccount,
    transport: http(protocolConfig.rpcUrl),
  });

  await Promise.all([
    ensureNativeGas("CCTP source wallet", sourceClient, sourceAccount.address),
    ensureNativeGas(
      "Avalanche settlement wallet",
      destinationClient,
      destinationAccount.address
    ),
    ensureContractDeployed(
      "CCTP source USDC contract",
      sourceClient,
      getAddress(cctpConfig.sourceUsdcAddress)
    ),
    ensureContractDeployed(
      "CCTP token messenger contract",
      sourceClient,
      getAddress(cctpConfig.tokenMessengerAddress)
    ),
    ensureContractDeployed(
      "CCTP message transmitter contract",
      destinationClient,
      getAddress(cctpConfig.messageTransmitterAddress)
    ),
  ]);

  const amount = toUsdcBaseUnits(
    input.mode === "subscription_charge" ? input.usdcAmount : input.amountUsdc
  );
  const burnParameters = await resolveBurnParameters({
    attestationApiUrl: cctpConfig.attestationApiUrl,
    sourceDomain: cctpConfig.sourceDomain,
    destinationDomain: cctpConfig.destinationDomain,
    amount,
  });
  const externalChargeIdHash = keccak256(stringToHex(input.externalChargeId));
  const sourceUsdcAddress = getAddress(cctpConfig.sourceUsdcAddress);
  const destinationUsdcAddress = getAddress(protocolConfig.settlementAssetAddress);
  const protocolAddress = getAddress(protocolConfig.protocolAddress);
  const tokenMessengerAddress = getAddress(cctpConfig.tokenMessengerAddress);
  const messageTransmitterAddress = getAddress(
    cctpConfig.messageTransmitterAddress
  );

  logCctp("bridge-start", {
    environment: mode,
    externalChargeId: input.externalChargeId,
    merchantAddress:
      input.mode === "settlement_credit"
        ? input.merchantAddress.toLowerCase()
        : null,
    sourceWalletAddress: sourceAccount.address.toLowerCase(),
    destinationWalletAddress: destinationAccount.address.toLowerCase(),
    sourceDomain: cctpConfig.sourceDomain,
    destinationDomain: cctpConfig.destinationDomain,
    sourceRpcUrl: cctpConfig.sourceRpcUrl,
    destinationRpcUrl: protocolConfig.rpcUrl,
    amountUsdc: formatBaseUnitsToUsdc(amount),
    transferMode: burnParameters.transferMode,
    minFinalityThreshold: burnParameters.minFinalityThreshold,
    maxFeeUsdc: formatBaseUnitsToUsdc(burnParameters.maxFee),
    fastTransferFeeBps: burnParameters.fastTransferFeeBps,
    fastTransferAllowanceUsdc: burnParameters.fastTransferAllowanceUsdc,
    fallbackReason: burnParameters.fallbackReason,
  });

  const sourceUsdcBalance = await sourceClient.readContract({
    address: sourceUsdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [sourceAccount.address],
  });

  if (sourceUsdcBalance < amount) {
    throw new HttpError(
      409,
      `CCTP source wallet ${sourceAccount.address} is short ${formatBaseUnitsToUsdc(
        amount
      ).toFixed(2)} USDC. Fund it with Circle test USDC before running settlement.`
    );
  }

  const sourceAllowance = await sourceClient.readContract({
    address: sourceUsdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [sourceAccount.address, tokenMessengerAddress],
  });

  if (sourceAllowance < amount) {
    const approvalHash = await sourceWalletClient.writeContract({
      address: sourceUsdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [tokenMessengerAddress, amount],
      chain: undefined,
    });
    await sourceClient.waitForTransactionReceipt({ hash: approvalHash });
    logCctp("source-approve-confirmed", {
      externalChargeId: input.externalChargeId,
      approvalTxHash: approvalHash.toLowerCase(),
      amountUsdc: formatBaseUnitsToUsdc(amount),
    });
  }

  const burnHash = await sourceWalletClient.writeContract({
    address: tokenMessengerAddress,
    abi: tokenMessengerAbi,
    functionName: "depositForBurn",
    args: [
      amount,
      cctpConfig.destinationDomain,
      addressToBytes32(destinationAccount.address),
      sourceUsdcAddress,
      ZERO_BYTES32,
      burnParameters.maxFee,
      burnParameters.minFinalityThreshold,
    ],
    chain: undefined,
  });
  await sourceClient.waitForTransactionReceipt({ hash: burnHash });
  logCctp("burn-confirmed", {
    externalChargeId: input.externalChargeId,
    burnTxHash: burnHash.toLowerCase(),
    transferMode: burnParameters.transferMode,
    minFinalityThreshold: burnParameters.minFinalityThreshold,
    maxFeeUsdc: formatBaseUnitsToUsdc(burnParameters.maxFee),
  });

  const attestation = await fetchAttestation({
    attestationApiUrl: cctpConfig.attestationApiUrl,
    sourceDomain: cctpConfig.sourceDomain,
    transactionHash: burnHash,
    pollIntervalMs: cctpConfig.attestationPollIntervalMs,
    timeoutMs: cctpConfig.attestationTimeoutMs,
    onStatusChange(status, elapsedMs) {
      logCctp("attestation-status", {
        externalChargeId: input.externalChargeId,
        burnTxHash: burnHash.toLowerCase(),
        status,
        elapsedSeconds: Math.round(elapsedMs / 1000),
      });
    },
  });
  logCctp("attestation-complete", {
    externalChargeId: input.externalChargeId,
    burnTxHash: burnHash.toLowerCase(),
  });

  const receiveHash = await destinationWalletClient.writeContract({
    address: messageTransmitterAddress,
    abi: messageTransmitterAbi,
    functionName: "receiveMessage",
    args: [attestation.message, attestation.attestation],
    chain: undefined,
  });
  await destinationClient.waitForTransactionReceipt({ hash: receiveHash });
  logCctp("receive-confirmed", {
    externalChargeId: input.externalChargeId,
    burnTxHash: burnHash.toLowerCase(),
    receiveTxHash: receiveHash.toLowerCase(),
  });

  const destinationAllowance = await destinationClient.readContract({
    address: destinationUsdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [destinationAccount.address, protocolAddress],
  });

  if (destinationAllowance < amount) {
    const approvalHash = await destinationWalletClient.writeContract({
      address: destinationUsdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [protocolAddress, amount],
      chain: undefined,
    });
    await destinationClient.waitForTransactionReceipt({ hash: approvalHash });
    logCctp("destination-approve-confirmed", {
      externalChargeId: input.externalChargeId,
      approvalTxHash: approvalHash.toLowerCase(),
      amountUsdc: formatBaseUnitsToUsdc(amount),
    });
  }

  const isChargeOperator = await destinationClient.readContract({
    address: protocolAddress,
    abi: renewProtocolAbi,
    functionName: "chargeOperators",
    args: [destinationAccount.address],
  });

  if (!isChargeOperator) {
    throw new HttpError(
      409,
      `Avalanche settlement wallet ${destinationAccount.address} is not an enabled Renew charge operator.`
    );
  }

  const protocolHash =
    input.mode === "subscription_charge"
      ? await destinationWalletClient.writeContract({
          address: protocolAddress,
          abi: renewProtocolAbi,
          functionName: "executeCharge",
          args: [
            BigInt(input.protocolSubscriptionId),
            toProtocolBytes32(input.externalChargeId),
            destinationAccount.address,
            toUsdcBaseUnits(input.localAmount),
            toUsdcBaseUnits(input.fxRate),
            BigInt(Math.max(0, Math.trunc(input.usageUnits ?? 0))),
            amount,
          ],
          chain: undefined,
        })
      : await destinationWalletClient.writeContract({
          address: protocolAddress,
          abi: renewProtocolAbi,
          functionName: "creditSettlement",
          args: [
            input.merchantAddress as Address,
            externalChargeIdHash,
            destinationAccount.address,
            amount,
          ],
          chain: undefined,
        });
  const protocolReceipt = await destinationClient.waitForTransactionReceipt({
    hash: protocolHash,
  });
  const protocolChargeId = extractProtocolChargeIdFromReceipt(protocolReceipt.logs);

  logCctp(
    input.mode === "subscription_charge"
      ? "execute-charge-confirmed"
      : "credit-confirmed",
    {
      externalChargeId: input.externalChargeId,
      burnTxHash: burnHash.toLowerCase(),
      creditTxHash: protocolHash.toLowerCase(),
      merchantAddress:
        input.mode === "subscription_charge"
          ? null
          : input.merchantAddress.toLowerCase(),
      protocolSubscriptionId:
        input.mode === "subscription_charge" ? input.protocolSubscriptionId : null,
      protocolChargeId,
    }
  );

  return {
    sourceWalletAddress: sourceAccount.address.toLowerCase(),
    destinationWalletAddress: destinationAccount.address.toLowerCase(),
    sourceUsdcAddress: sourceUsdcAddress.toLowerCase(),
    destinationUsdcAddress: destinationUsdcAddress.toLowerCase(),
    bridgedUsdc: formatBaseUnitsToUsdc(amount),
    bridgeSourceTxHash: burnHash.toLowerCase(),
    bridgeReceiveTxHash: receiveHash.toLowerCase(),
    creditTxHash: protocolHash.toLowerCase(),
    protocolChargeId,
    protocolExecutionKind:
      input.mode === "subscription_charge" ? "subscription_charge" : "settlement_credit",
    attestedAt: new Date(),
  };
}

export async function recordFailedProtocolCharge(input: {
  environment: "test" | "live";
  protocolSubscriptionId: string;
  externalChargeId: string;
  failureCode: string;
}) {
  const protocolConfig = getProtocolRuntimeConfig(input.environment);
  const destinationAccount = privateKeyToAccount(
    (input.environment === "live"
      ? env.SAFE_EXECUTOR_PRIVATE_KEY_LIVE
      : env.SAFE_EXECUTOR_PRIVATE_KEY_TEST) as Hex
  );
  const destinationClient = createPublicClient({
    transport: http(protocolConfig.rpcUrl),
  });
  const destinationWalletClient = createWalletClient({
    account: destinationAccount,
    transport: http(protocolConfig.rpcUrl),
  });
  const protocolAddress = getAddress(protocolConfig.protocolAddress);

  await ensureNativeGas(
    "Avalanche settlement wallet",
    destinationClient,
    destinationAccount.address
  );

  const isChargeOperator = await destinationClient.readContract({
    address: protocolAddress,
    abi: renewProtocolAbi,
    functionName: "chargeOperators",
    args: [destinationAccount.address],
  });

  if (!isChargeOperator) {
    throw new HttpError(
      409,
      `Avalanche settlement wallet ${destinationAccount.address} is not an enabled Renew charge operator.`
    );
  }

  const txHash = await destinationWalletClient.writeContract({
    address: protocolAddress,
    abi: renewProtocolAbi,
    functionName: "recordFailedCharge",
    args: [
      BigInt(input.protocolSubscriptionId),
      toProtocolBytes32(input.externalChargeId),
      toProtocolBytes32(input.failureCode),
    ],
    chain: undefined,
  });
  const receipt = await destinationClient.waitForTransactionReceipt({ hash: txHash });

  return {
    protocolChargeId: extractProtocolChargeIdFromReceipt(receipt.logs),
    txHash: txHash.toLowerCase(),
  };
}
