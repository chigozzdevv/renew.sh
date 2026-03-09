import { env } from "@/config/env.config";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function requireConfigured(label: string, value: string) {
  if (!value.trim() || value === ZERO_ADDRESS) {
    throw new Error(`${label} is not configured.`);
  }

  return value.trim();
}

export function getCctpConfig(mode: RuntimeMode = env.PAYMENT_ENV) {
  const isLive = mode === "live";
  const testFallbackSourceKey =
    env.CCTP_SOURCE_PRIVATE_KEY_TEST ||
    env.SAFE_EXECUTOR_PRIVATE_KEY_TEST ||
    env.DEPLOYER_PRIVATE_KEY_TEST;

  const config = {
    mode,
    sourceChainId: isLive
      ? env.CCTP_SOURCE_CHAIN_ID_LIVE
      : env.CCTP_SOURCE_CHAIN_ID_TEST,
    sourceRpcUrl: isLive
      ? env.CCTP_SOURCE_RPC_URL_LIVE
      : env.CCTP_SOURCE_RPC_URL_TEST,
    sourcePrivateKey: isLive
      ? env.CCTP_SOURCE_PRIVATE_KEY_LIVE
      : testFallbackSourceKey,
    sourceDomain: isLive
      ? env.CCTP_SOURCE_DOMAIN_LIVE
      : env.CCTP_SOURCE_DOMAIN_TEST,
    destinationDomain: isLive
      ? env.CCTP_DEST_DOMAIN_LIVE
      : env.CCTP_DEST_DOMAIN_TEST,
    sourceUsdcAddress: isLive
      ? env.CCTP_SOURCE_USDC_ADDRESS_LIVE
      : env.CCTP_SOURCE_USDC_ADDRESS_TEST,
    tokenMessengerAddress: isLive
      ? env.CCTP_TOKEN_MESSENGER_ADDRESS_LIVE
      : env.CCTP_TOKEN_MESSENGER_ADDRESS_TEST,
    messageTransmitterAddress: isLive
      ? env.CCTP_MESSAGE_TRANSMITTER_ADDRESS_LIVE
      : env.CCTP_MESSAGE_TRANSMITTER_ADDRESS_TEST,
    attestationApiUrl: isLive
      ? env.CCTP_ATTESTATION_API_URL_LIVE
      : env.CCTP_ATTESTATION_API_URL_TEST,
    attestationPollIntervalMs: env.CCTP_ATTESTATION_POLL_INTERVAL_MS,
    attestationTimeoutMs: env.CCTP_ATTESTATION_TIMEOUT_MS,
  };

  return {
    ...config,
    assertConfigured() {
      return {
        ...config,
        sourceRpcUrl: requireConfigured("CCTP source RPC", config.sourceRpcUrl),
        sourcePrivateKey: requireConfigured(
          "CCTP source private key",
          config.sourcePrivateKey
        ),
        sourceUsdcAddress: requireConfigured(
          "CCTP source USDC address",
          config.sourceUsdcAddress
        ),
        tokenMessengerAddress: requireConfigured(
          "CCTP token messenger address",
          config.tokenMessengerAddress
        ),
        messageTransmitterAddress: requireConfigured(
          "CCTP message transmitter address",
          config.messageTransmitterAddress
        ),
      };
    },
  };
}

export type CctpRuntimeConfig = ReturnType<typeof getCctpConfig>;
