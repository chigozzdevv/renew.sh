import type { MetaTransactionData } from "@safe-global/types-kit";

export type SafeAccountSnapshot = {
  safeAddress: string;
  owners: string[];
  threshold: number;
  nonce?: number | null;
};

export type CreateSafeAccountInput = {
  owners: string[];
  threshold: number;
};

export type ProposeSafeTransactionInput = {
  safeAddress: string;
  transactions: MetaTransactionData[];
  senderAddress: string;
  senderSignature: string;
  origin: string;
  safeNonce?: number | null;
};

export type ProposedSafeTransaction = {
  safeAddress: string;
  safeTxHash: string;
  safeNonce: number | null;
  threshold: number;
};

export type ConfirmSafeTransactionInput = {
  safeTxHash: string;
  signature: string;
};

export type ExecuteSafeTransactionInput = {
  safeAddress: string;
  safeTxHash: string;
  transactions?: MetaTransactionData[];
  safeNonce?: number | null;
  signatures?: Array<{
    signer: string;
    signature: string;
  }>;
};

export type SafeTransactionDraft = {
  safeAddress: string;
  targetAddress: string;
  value: string;
  data: string;
};

export type BuildSafeAddOwnerTransactionInput = {
  safeAddress: string;
  ownerAddress: string;
  threshold?: number;
};

export type BuildSafeRemoveOwnerTransactionInput = {
  safeAddress: string;
  ownerAddress: string;
  threshold?: number;
};

export type BuildSafeThresholdTransactionInput = {
  safeAddress: string;
  threshold: number;
};

export type BuildSafeTransactionSigningPayloadInput = {
  safeAddress: string;
  targetAddress: string;
  value: string;
  data: string;
  safeNonce?: number | null;
};

export type SafeTransactionSigningPayload = {
  safeAddress: string;
  safeTxHash: string;
  safeNonce: number;
  typedData: unknown;
};

export type ExecutedSafeTransaction = {
  safeAddress: string;
  safeTxHash: string;
  txHash: string;
};

export interface SafeProvider {
  getSafeInfo(safeAddress: string): Promise<SafeAccountSnapshot>;
  createSafeAccount(input: CreateSafeAccountInput): Promise<SafeAccountSnapshot>;
  proposeTransaction(
    input: ProposeSafeTransactionInput
  ): Promise<ProposedSafeTransaction>;
  buildAddOwnerTransaction(
    input: BuildSafeAddOwnerTransactionInput
  ): Promise<SafeTransactionDraft>;
  buildRemoveOwnerTransaction(
    input: BuildSafeRemoveOwnerTransactionInput
  ): Promise<SafeTransactionDraft>;
  buildChangeThresholdTransaction(
    input: BuildSafeThresholdTransactionInput
  ): Promise<SafeTransactionDraft>;
  buildTransactionSigningPayload(
    input: BuildSafeTransactionSigningPayloadInput
  ): Promise<SafeTransactionSigningPayload>;
  confirmTransaction(input: ConfirmSafeTransactionInput): Promise<void>;
  executeTransaction(
    input: ExecuteSafeTransactionInput
  ): Promise<ExecutedSafeTransaction>;
}
