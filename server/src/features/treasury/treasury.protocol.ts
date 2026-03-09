import { encodeFunctionData, parseAbi } from "viem";

const renewProtocolAbi = parseAbi([
  "function withdraw(uint256 amount)",
  "function requestMerchantPayoutWalletUpdate(address payoutWallet)",
  "function confirmMerchantPayoutWalletUpdate()",
  "function updateReserveWallet(address reserveWallet)",
  "function clearReserveWallet()",
  "function promoteReserveWallet()",
]);

function toScaledIntegerString(amount: number, decimals: number) {
  const fixedAmount = amount.toFixed(decimals);
  const [wholePart, fractionPart = ""] = fixedAmount.split(".");

  return `${wholePart}${fractionPart.padEnd(decimals, "0")}`;
}

export function toUsdcBaseUnits(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("USDC amount must be a finite, non-negative number.");
  }

  return BigInt(toScaledIntegerString(amount, 6));
}

export function fromUsdcBaseUnits(amount: bigint) {
  return Number(amount) / 1_000_000;
}

export function encodeWithdrawCall(amount: number) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "withdraw",
    args: [toUsdcBaseUnits(amount)],
  });
}

export function encodeWithdrawCallBaseUnits(amount: bigint) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "withdraw",
    args: [amount],
  });
}

export function encodePayoutWalletChangeRequestCall(payoutWallet: string) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "requestMerchantPayoutWalletUpdate",
    args: [payoutWallet],
  });
}

export function encodePayoutWalletChangeConfirmCall() {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "confirmMerchantPayoutWalletUpdate",
  });
}

export function encodeReserveWalletUpdateCall(reserveWallet: string) {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "updateReserveWallet",
    args: [reserveWallet],
  });
}

export function encodeReserveWalletClearCall() {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "clearReserveWallet",
  });
}

export function encodeReserveWalletPromoteCall() {
  return encodeFunctionData({
    abi: renewProtocolAbi,
    functionName: "promoteReserveWallet",
  });
}
