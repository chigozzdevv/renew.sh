import type { Abi } from "../types/abi";
import type { Address } from "../types/protocol";

export type ContractCallRequest = {
  readonly address: Address;
  readonly abi: Abi;
  readonly functionName: string;
  readonly args?: readonly unknown[];
};

export interface ContractTransport {
  read<TResult>(request: ContractCallRequest): Promise<TResult>;
  write<TResult>(request: ContractCallRequest): Promise<TResult>;
}
