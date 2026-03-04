import { renewProtocolAbi } from "../abi/renew-protocol";
import type { ContractTransport } from "./contract-transport";
import type { Address } from "../types/protocol";

export type RenewProtocolClient = ReturnType<typeof createRenewProtocolClient>;

export function createRenewProtocolClient(
  transport: ContractTransport,
  address: Address
) {
  return {
    address,
    registerMerchant(payoutWallet: Address, metadataHash: string) {
      return transport.write<void>({
        address,
        abi: renewProtocolAbi,
        functionName: "registerMerchant",
        args: [payoutWallet, metadataHash],
      });
    },
    createPlan(input: {
      planCode: string;
      usdPrice: bigint;
      billingInterval: bigint;
      trialPeriod: number;
      retryWindow: number;
      billingMode: number;
      usageRate: bigint;
    }) {
      return transport.write<bigint>({
        address,
        abi: renewProtocolAbi,
        functionName: "createPlan",
        args: [
          input.planCode,
          input.usdPrice,
          input.billingInterval,
          input.trialPeriod,
          input.retryWindow,
          input.billingMode,
          input.usageRate,
        ],
      });
    },
    createSubscription(input: {
      planId: bigint;
      customerRef: string;
      billingCurrency: string;
      firstChargeAt: bigint;
      localAmountSnapshot: bigint;
    }) {
      return transport.write<bigint>({
        address,
        abi: renewProtocolAbi,
        functionName: "createSubscription",
        args: [
          input.planId,
          input.customerRef,
          input.billingCurrency,
          input.firstChargeAt,
          input.localAmountSnapshot,
        ],
      });
    },
    executeCharge(input: {
      subscriptionId: bigint;
      externalChargeId: string;
      settlementSource: Address;
      localAmount: bigint;
      fxRate: bigint;
      usdcAmount: bigint;
    }) {
      return transport.write<bigint>({
        address,
        abi: renewProtocolAbi,
        functionName: "executeCharge",
        args: [
          input.subscriptionId,
          input.externalChargeId,
          input.settlementSource,
          input.localAmount,
          input.fxRate,
          input.usdcAmount,
        ],
      });
    },
    recordFailedCharge(input: {
      subscriptionId: bigint;
      externalChargeId: string;
      failureCode: string;
    }) {
      return transport.write<bigint>({
        address,
        abi: renewProtocolAbi,
        functionName: "recordFailedCharge",
        args: [
          input.subscriptionId,
          input.externalChargeId,
          input.failureCode,
        ],
      });
    },
    pauseSubscription(subscriptionId: bigint) {
      return transport.write<void>({
        address,
        abi: renewProtocolAbi,
        functionName: "pauseSubscription",
        args: [subscriptionId],
      });
    },
    resumeSubscription(subscriptionId: bigint, nextChargeAt: bigint) {
      return transport.write<void>({
        address,
        abi: renewProtocolAbi,
        functionName: "resumeSubscription",
        args: [subscriptionId, nextChargeAt],
      });
    },
    cancelSubscription(subscriptionId: bigint) {
      return transport.write<void>({
        address,
        abi: renewProtocolAbi,
        functionName: "cancelSubscription",
        args: [subscriptionId],
      });
    },
  };
}
