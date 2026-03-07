import Safe, {
  EthSafeSignature,
  generateTypedData,
} from "@safe-global/protocol-kit";
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
import type {
  BuildSafeAddOwnerTransactionInput,
  BuildSafeRemoveOwnerTransactionInput,
  BuildSafeThresholdTransactionInput,
  BuildSafeTransactionSigningPayloadInput,
  ConfirmSafeTransactionInput,
  CreateSafeAccountInput,
  ExecuteSafeTransactionInput,
  ExecutedSafeTransaction,
  ProposedSafeTransaction,
  ProposeSafeTransactionInput,
  SafeAccountSnapshot,
  SafeProvider,
  SafeTransactionDraft,
  SafeTransactionSigningPayload,
} from "@/features/treasury/providers/safe/safe.types";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function getDeterministicOptions(safeNonce?: number | null) {
  return {
    nonce: safeNonce ?? undefined,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: ZERO_ADDRESS,
    refundReceiver: ZERO_ADDRESS,
  };
}

export class SafeTestnetProvider implements SafeProvider {
  private readonly config = getSafeConfig("test");

  async getSafeInfo(safeAddress: string): Promise<SafeAccountSnapshot> {
    const protocolKit = await this.getProtocolKit({
      safeAddress,
    });

    const [owners, threshold, nonce] = await Promise.all([
      protocolKit.getOwners(),
      protocolKit.getThreshold(),
      protocolKit.getNonce(),
    ]);

    return {
      safeAddress: normalizeAddress(safeAddress),
      owners: owners.map(normalizeAddress),
      threshold,
      nonce,
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
      options: getDeterministicOptions(input.safeNonce),
    });

    return {
      safeAddress: normalizeAddress(input.safeAddress),
      safeTxHash: (await protocolKit.getTransactionHash(safeTransaction)).toLowerCase(),
      safeNonce: safeTransaction.data.nonce,
      threshold: await protocolKit.getThreshold(),
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
      options: getDeterministicOptions(input.safeNonce),
    });
    const chainId = await protocolKit.getChainId();
    const safeVersion = protocolKit.getContractVersion();

    return {
      safeAddress: normalizeAddress(input.safeAddress),
      safeTxHash: (await protocolKit.getTransactionHash(safeTransaction)).toLowerCase(),
      safeNonce: safeTransaction.data.nonce,
      typedData: generateTypedData({
        safeAddress: normalizeAddress(input.safeAddress),
        safeVersion,
        chainId,
        data: safeTransaction.data,
      }),
    };
  }

  async confirmTransaction(_input: ConfirmSafeTransactionInput): Promise<void> {
    return;
  }

  async executeTransaction(
    input: ExecuteSafeTransactionInput
  ): Promise<ExecutedSafeTransaction> {
    const executorPrivateKey = this.getExecutorPrivateKey();
    const protocolKit = await this.getProtocolKit({
      safeAddress: input.safeAddress,
      signerPrivateKey: executorPrivateKey,
    });

    if (!input.transactions?.length) {
      throw new Error("Testnet Safe execution requires transaction data.");
    }

    const safeTransaction = await protocolKit.createTransaction({
      transactions: input.transactions,
      options: getDeterministicOptions(input.safeNonce),
    });

    for (const entry of input.signatures ?? []) {
      safeTransaction.addSignature(
        new EthSafeSignature(
          normalizeAddress(entry.signer),
          entry.signature
        )
      );
    }

    const execution = await protocolKit.executeTransaction(safeTransaction);
    const publicClient = createPublicClient({
      transport: http(this.config.rpcUrl),
    });

    await publicClient.waitForTransactionReceipt({
      hash: execution.hash as Hex,
    });

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
