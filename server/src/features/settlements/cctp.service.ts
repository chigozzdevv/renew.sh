import {
  createPublicClient,
  createWalletClient,
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
  "function chargeOperators(address operator) view returns (bool)",
]);

const SIX_DECIMAL_SCALE = 1_000_000n;
const ZERO_BYTES32 = `0x${"0".repeat(64)}` as Hex;
const STANDARD_FINALITY_THRESHOLD = 2_000;

type CircleAttestationResponse = {
  messages?: Array<{
    message?: string;
    attestation?: string;
    status?: string;
  }>;
};

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

async function fetchAttestation(input: {
  attestationApiUrl: string;
  sourceDomain: number;
  transactionHash: Hex;
  pollIntervalMs: number;
  timeoutMs: number;
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < input.timeoutMs) {
    const response = await fetch(
      `${input.attestationApiUrl}/v2/messages/${input.sourceDomain}?transactionHash=${input.transactionHash}`
    );

    if (response.ok) {
      const payload = (await response.json()) as CircleAttestationResponse;
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
    }

    await new Promise((resolve) => setTimeout(resolve, input.pollIntervalMs));
  }

  throw new HttpError(504, "Timed out waiting for Circle attestation.");
}

export async function bridgeSettlementToAvalanche(input: {
  merchantAddress: string;
  externalChargeId: string;
  netUsdc: number;
}) {
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
  ]);

  const amount = toUsdcBaseUnits(input.netUsdc);
  const externalChargeIdHash = keccak256(stringToHex(input.externalChargeId));
  const sourceUsdcAddress = cctpConfig.sourceUsdcAddress as Address;
  const destinationUsdcAddress = protocolConfig.settlementAssetAddress as Address;
  const protocolAddress = protocolConfig.protocolAddress as Address;
  const tokenMessengerAddress = cctpConfig.tokenMessengerAddress as Address;
  const messageTransmitterAddress =
    cctpConfig.messageTransmitterAddress as Address;

  const sourceUsdcBalance = await sourceClient.readContract({
    address: sourceUsdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [sourceAccount.address],
  });

  if (sourceUsdcBalance < amount) {
    throw new HttpError(
      409,
      `CCTP source wallet ${sourceAccount.address} is short ${input.netUsdc.toFixed(
        2
      )} USDC. Fund it with Circle test USDC before running settlement.`
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
      0n,
      STANDARD_FINALITY_THRESHOLD,
    ],
    chain: undefined,
  });
  await sourceClient.waitForTransactionReceipt({ hash: burnHash });

  const attestation = await fetchAttestation({
    attestationApiUrl: cctpConfig.attestationApiUrl,
    sourceDomain: cctpConfig.sourceDomain,
    transactionHash: burnHash,
    pollIntervalMs: cctpConfig.attestationPollIntervalMs,
    timeoutMs: cctpConfig.attestationTimeoutMs,
  });

  const receiveHash = await destinationWalletClient.writeContract({
    address: messageTransmitterAddress,
    abi: messageTransmitterAbi,
    functionName: "receiveMessage",
    args: [attestation.message, attestation.attestation],
    chain: undefined,
  });
  await destinationClient.waitForTransactionReceipt({ hash: receiveHash });

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

  const creditHash = await destinationWalletClient.writeContract({
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
  await destinationClient.waitForTransactionReceipt({ hash: creditHash });

  return {
    sourceWalletAddress: sourceAccount.address.toLowerCase(),
    destinationWalletAddress: destinationAccount.address.toLowerCase(),
    sourceUsdcAddress: sourceUsdcAddress.toLowerCase(),
    destinationUsdcAddress: destinationUsdcAddress.toLowerCase(),
    bridgedUsdc: formatBaseUnitsToUsdc(amount),
    bridgeSourceTxHash: burnHash.toLowerCase(),
    bridgeReceiveTxHash: receiveHash.toLowerCase(),
    creditTxHash: creditHash.toLowerCase(),
    attestedAt: new Date(),
  };
}
