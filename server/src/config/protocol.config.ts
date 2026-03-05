import { env } from "@/config/env.config";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

export function getProtocolRuntimeConfig(mode: RuntimeMode = env.AVALANCHE_ENV) {
  const isLive = mode === "live";

  return {
    mode,
    chainId: isLive ? env.AVALANCHE_CHAIN_ID_LIVE : env.AVALANCHE_CHAIN_ID_TEST,
    rpcUrl: isLive ? env.AVALANCHE_RPC_URL_LIVE : env.AVALANCHE_RPC_URL_TEST,
    protocolAddress: isLive
      ? env.RENEW_PROTOCOL_ADDRESS_LIVE
      : env.RENEW_PROTOCOL_ADDRESS_TEST,
    vaultAddress: isLive ? env.RENEW_VAULT_ADDRESS_LIVE : env.RENEW_VAULT_ADDRESS_TEST,
    settlementAssetAddress: isLive
      ? env.USDC_TOKEN_ADDRESS_LIVE
      : env.USDC_TOKEN_ADDRESS_TEST,
  };
}
