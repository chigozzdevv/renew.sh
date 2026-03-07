import { env } from "@/config/env.config";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

type SafeModeConfig = {
  chainId: bigint;
  rpcUrl: string;
  txServiceUrl: string;
  executorPrivateKey: string;
  protocolAddress: string;
};

export function getSafeConfig(mode: RuntimeMode): SafeModeConfig {
  const isLive = mode === "live";

  return {
    chainId: BigInt(
      isLive ? env.AVALANCHE_CHAIN_ID_LIVE : env.AVALANCHE_CHAIN_ID_TEST
    ),
    rpcUrl: isLive ? env.AVALANCHE_RPC_URL_LIVE : env.AVALANCHE_RPC_URL_TEST,
    txServiceUrl: isLive
      ? env.SAFE_TX_SERVICE_URL_LIVE
      : env.SAFE_TX_SERVICE_URL_TEST,
    executorPrivateKey: isLive
      ? env.SAFE_EXECUTOR_PRIVATE_KEY_LIVE
      : env.SAFE_EXECUTOR_PRIVATE_KEY_TEST,
    protocolAddress: isLive
      ? env.RENEW_PROTOCOL_ADDRESS_LIVE
      : env.RENEW_PROTOCOL_ADDRESS_TEST,
  };
}
