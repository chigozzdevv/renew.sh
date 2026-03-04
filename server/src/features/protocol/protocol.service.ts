import { getProtocolRuntimeConfig } from "@/config/protocol.config";

export function getProtocolStatus() {
  return {
    network: "avalanche-c-chain",
    settlementAsset: "USDC",
    config: getProtocolRuntimeConfig(),
  };
}
