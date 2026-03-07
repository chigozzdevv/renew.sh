import SafeApiKit from "@safe-global/api-kit";
import Safe, { generateTypedData } from "@safe-global/protocol-kit";
import type { MetaTransactionData } from "@safe-global/types-kit";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSafeConfig } from "@/config/safe.config";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";
import type {
  ConfirmSafeTransactionInput,
  BuildSafeTransactionSigningPayloadInput,
  SafeTransactionSigningPayload,
  BuildSafeAddOwnerTransactionInput,
  BuildSafeRemoveOwnerTransactionInput,
  BuildSafeThresholdTransactionInput,
  CreateSafeAccountInput,
  ExecuteSafeTransactionInput,
  ExecutedSafeTransaction,
  ProposedSafeTransaction,
  ProposeSafeTransactionInput,
  SafeTransactionDraft,
  SafeAccountSnapshot,
  SafeProvider,
} from "@/features/treasury/providers/safe/safe.types";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export class SafeLiveProvider implements SafeProvider {
  private readonly config: ReturnType<typeof getSafeConfig>;

  private readonly apiKit: SafeApiKit;

  constructor(mode: RuntimeMode = "live") {
    this.config = getSafeConfig(mode);

    if (!this.config.txServiceUrl) {
      throw new Error("Safe transaction service URL is not configured.");
    }

    this.apiKit = new SafeApiKit({
      chainId: this.config.chainId,
      txServiceUrl: this.config.txServiceUrl,
    });
  }

  async getSafeInfo(safeAddress: string): Promise<SafeAccountSnapshot> {
    const safeInfo = await this.apiKit.getSafeInfo(safeAddress);

    return {
      safeAddress: normalizeAddress(safeInfo.address),
      owners: safeInfo.owners.map(normalizeAddress),
      threshold: safeInfo.threshold,
      nonce: Number(safeInfo.nonce),
    };
  }

  async createSafeAccount(
    input: CreateSafeAccountInput
  ): Promise<SafeAccountSnapshot> {
    const executorPrivateKey = this.getExecutorPrivateKey();
    const protocolKit = await Safe.init({
      provider: this.config.rpcUrl,
      signer: executorPrivateKey,
      predictedSafe: {
        safeAccountConfig: {
          owners: input.owners.map(normalizeAddress),
          threshold: input.threshold,
        },
      },
    });

    const safeAddress = normalizeAddress(await protocolKit.getAddress());

    if (!(await protocolKit.isSafeDeployed())) {
      const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
      const publicClient = createPublicClient({
        transport: http(this.config.rpcUrl),
      });
      const walletClient = this.getExecutorWalletClient(executorPrivateKey);
      const deploymentHash = await walletClient.sendTransaction({
        account: walletClient.account,
        chain: undefined,
        to: deploymentTx.to as Address,
        data: deploymentTx.data as Hex,
        value: BigInt(deploymentTx.value),
      });

      await publicClient.waitForTransactionReceipt({
        hash: deploymentHash,
      });
    }

    return this.getSafeInfo(safeAddress);
  }

  async proposeTransaction(
    input: ProposeSafeTransactionInput
  ): Promise<ProposedSafeTransaction> {
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
    });
    const safeTransaction = await protocolKit.createTransaction({
      transactions: input.transactions as MetaTransactionData[],
      options:
        input.safeNonce !== undefined && input.safeNonce !== null
          ? { nonce: input.safeNonce }
          : undefined,
    });
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

    await this.apiKit.proposeTransaction({
      safeAddress: input.safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: input.senderAddress,
      senderSignature: input.senderSignature,
      origin: input.origin,
    });

    const safeInfo = await this.apiKit.getSafeInfo(input.safeAddress);

    return {
      safeAddress: normalizeAddress(input.safeAddress),
      safeTxHash: safeTxHash.toLowerCase(),
      safeNonce: safeTransaction.data.nonce,
      threshold: safeInfo.threshold,
    };
  }

  async buildAddOwnerTransaction(
    input: BuildSafeAddOwnerTransactionInput
  ): Promise<SafeTransactionDraft> {
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
    });
    const safeTransaction = await protocolKit.createAddOwnerTx({
      ownerAddress: normalizeAddress(input.ownerAddress),
      threshold: input.threshold,
    });

    return this.toDraftTransaction(input.safeAddress, safeTransaction.data);
  }

  async buildRemoveOwnerTransaction(
    input: BuildSafeRemoveOwnerTransactionInput
  ): Promise<SafeTransactionDraft> {
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
    });
    const safeTransaction = await protocolKit.createRemoveOwnerTx({
      ownerAddress: normalizeAddress(input.ownerAddress),
      threshold: input.threshold,
    });

    return this.toDraftTransaction(input.safeAddress, safeTransaction.data);
  }

  async buildChangeThresholdTransaction(
    input: BuildSafeThresholdTransactionInput
  ): Promise<SafeTransactionDraft> {
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
    });
    const safeTransaction = await protocolKit.createChangeThresholdTx(
      input.threshold
    );

    return this.toDraftTransaction(input.safeAddress, safeTransaction.data);
  }

  async buildTransactionSigningPayload(
    input: BuildSafeTransactionSigningPayloadInput
  ): Promise<SafeTransactionSigningPayload> {
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
    });
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [
        {
          to: normalizeAddress(input.targetAddress),
          value: input.value,
          data: input.data,
        },
      ],
      options:
        input.safeNonce !== undefined && input.safeNonce !== null
          ? { nonce: input.safeNonce }
          : undefined,
    });
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const chainId = await protocolKit.getChainId();
    const safeVersion = protocolKit.getContractVersion();

    return {
      safeAddress: normalizeAddress(input.safeAddress),
      safeTxHash: safeTxHash.toLowerCase(),
      safeNonce: safeTransaction.data.nonce,
      typedData: generateTypedData({
        safeAddress: normalizeAddress(input.safeAddress),
        safeVersion,
        chainId,
        data: safeTransaction.data,
      }),
    };
  }

  async confirmTransaction(input: ConfirmSafeTransactionInput): Promise<void> {
    await this.apiKit.confirmTransaction(input.safeTxHash, input.signature);
  }

  async executeTransaction(
    input: ExecuteSafeTransactionInput
  ): Promise<ExecutedSafeTransaction> {
    const executorPrivateKey = this.getExecutorPrivateKey();
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
      signerPrivateKey: executorPrivateKey,
    });
    const pendingTransaction = await this.apiKit.getTransaction(input.safeTxHash);
    const execution = await protocolKit.executeTransaction(pendingTransaction);

    return {
      safeAddress: normalizeAddress(input.safeAddress),
      safeTxHash: input.safeTxHash.toLowerCase(),
      txHash: execution.hash.toLowerCase(),
    };
  }

  private getExecutorPrivateKey() {
    const normalized = this.config.executorPrivateKey.trim();

    if (!normalized) {
      throw new Error("Safe executor private key is not configured.");
    }

    return normalized as Hex;
  }

  private getExecutorWalletClient(executorPrivateKey: Hex) {
    const account = privateKeyToAccount(executorPrivateKey);

    return createWalletClient({
      account,
      transport: http(this.config.rpcUrl),
    });
  }

  private toDraftTransaction(
    safeAddress: string,
    safeTransactionData: {
      to: string;
      value: string;
      data: string;
    }
  ): SafeTransactionDraft {
    return {
      safeAddress: normalizeAddress(safeAddress),
      targetAddress: normalizeAddress(safeTransactionData.to),
      value: safeTransactionData.value,
      data: safeTransactionData.data,
    };
  }

  private async getProtocolKit(input: {
    safeAddress: string;
    signerPrivateKey?: Hex;
  }) {
    return Safe.init({
      provider: this.config.rpcUrl,
      signer: input.signerPrivateKey,
      safeAddress: input.safeAddress,
    });
  }
}
