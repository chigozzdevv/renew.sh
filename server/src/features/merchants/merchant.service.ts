import { HttpError } from "@/shared/errors/http-error";

import { MerchantModel } from "@/features/merchants/merchant.model";
import type {
  CreateMerchantInput,
  ListMerchantsQuery,
  UpdateMerchantInput,
} from "@/features/merchants/merchant.validation";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

function toMerchantResponse(document: {
  _id: { toString(): string };
  merchantAccount: string;
  payoutWallet: string;
  reserveWallet?: string | null;
  name: string;
  supportEmail: string;
  billingTimezone: string;
  supportedMarkets: string[];
  metadataHash: string;
  status: string;
  environmentMode: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantAccount: document.merchantAccount,
    payoutWallet: document.payoutWallet,
    reserveWallet: document.reserveWallet ?? null,
    name: document.name,
    supportEmail: document.supportEmail,
    billingTimezone: document.billingTimezone,
    supportedMarkets: document.supportedMarkets,
    metadataHash: document.metadataHash,
    status: document.status,
    environmentMode: document.environmentMode,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function getMerchantEnvironmentModeById(
  merchantId: string
): Promise<RuntimeMode> {
  const merchant = await MerchantModel.findById(merchantId)
    .select({ environmentMode: 1 })
    .lean()
    .exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  return merchant.environmentMode === "live" ? "live" : "test";
}

export async function createMerchant(input: CreateMerchantInput) {
  const merchantAccount = input.merchantAccount.toLowerCase();
  const existingMerchant = await MerchantModel.findOne({ merchantAccount }).exec();

  if (existingMerchant) {
    throw new HttpError(409, "A merchant already exists for this account.");
  }

  const createdMerchant = await MerchantModel.create({
    merchantAccount,
    payoutWallet: input.payoutWallet.toLowerCase(),
    reserveWallet: input.reserveWallet?.toLowerCase() ?? null,
    name: input.name,
    supportEmail: input.supportEmail,
    billingTimezone: input.billingTimezone,
    supportedMarkets: input.supportedMarkets,
    metadataHash: input.metadataHash,
    status: input.status,
    environmentMode: input.environmentMode,
  });

  return toMerchantResponse(createdMerchant);
}

export async function listMerchants(query: ListMerchantsQuery) {
  const mongoQuery: Record<string, unknown> = {};

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    mongoQuery.$or = [
      { name: pattern },
      { supportEmail: pattern },
      { merchantAccount: pattern },
    ];
  }

  const merchants = await MerchantModel.find(mongoQuery)
    .sort({ createdAt: -1 })
    .exec();

  return merchants.map(toMerchantResponse);
}

export async function getMerchantById(merchantId: string) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  return toMerchantResponse(merchant);
}

export async function updateMerchant(
  merchantId: string,
  input: UpdateMerchantInput
) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  if (input.payoutWallet !== undefined) {
    merchant.payoutWallet = input.payoutWallet.toLowerCase();
  }

  if (input.reserveWallet !== undefined) {
    merchant.reserveWallet = input.reserveWallet?.toLowerCase() ?? null;
  }

  if (input.name !== undefined) {
    merchant.name = input.name;
  }

  if (input.supportEmail !== undefined) {
    merchant.supportEmail = input.supportEmail;
  }

  if (input.billingTimezone !== undefined) {
    merchant.billingTimezone = input.billingTimezone;
  }

  if (input.supportedMarkets !== undefined) {
    merchant.supportedMarkets = input.supportedMarkets;
  }

  if (input.metadataHash !== undefined) {
    merchant.metadataHash = input.metadataHash;
  }

  if (input.status !== undefined) {
    merchant.status = input.status;
  }

  if (input.environmentMode !== undefined) {
    merchant.environmentMode = input.environmentMode;
  }

  await merchant.save();

  return toMerchantResponse(merchant);
}
