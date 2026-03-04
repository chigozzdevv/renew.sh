import { env } from "@/config/env.config";

export function getProtocolRuntimeConfig() {
  return {
    chainId: env.AVALANCHE_CHAIN_ID,
    rpcUrl: env.AVALANCHE_RPC_URL,
    protocolAddress: env.RENEW_PROTOCOL_ADDRESS,
    vaultAddress: env.RENEW_VAULT_ADDRESS,
    settlementAssetAddress: env.USDC_TOKEN_ADDRESS,
  };
}
