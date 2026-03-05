import { getYellowCardConfig } from "@/config/yellow-card.config";
import type {
  YellowCardChannel,
  YellowCardCollectionRequestInput,
  YellowCardNetwork,
  YellowCardProvider,
} from "@/features/payment-rails/providers/yellow-card/yellow-card.types";
import type {
  CreateWidgetQuoteInput,
  ResolveBankAccountInput,
} from "@/features/payment-rails/payment-rails.validation";

type MockCollectionRecord = {
  id: string;
  sequenceId: string;
  status: string;
  customerUID: string;
  channelId: string;
  currency: string;
  country: string;
  rate: number;
  convertedAmount: number;
  bankInfo?: {
    name: string;
    accountNumber: string;
    accountName: string;
  } | null;
  localAmount?: number | null;
  amount?: number | null;
  reference: string;
  depositId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

function hashToInt(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function generateDigits(seed: string, size: number) {
  let value = hashToInt(seed).toString();

  while (value.length < size) {
    value = `${value}${hashToInt(`${value}:${seed}`)}`;
  }

  return value.slice(0, size);
}

function buildMockReference(seed: string) {
  return `YC-${generateDigits(`${seed}:ref`, 8)}`;
}

function buildMockDepositId(seed: string) {
  const left = generateDigits(`${seed}:left`, 8);
  const right = generateDigits(`${seed}:right`, 8);
  return `${left}-${right}`;
}

function inferMockSettlementStatus(
  accountNumber?: string
): "complete" | "processing" | "failed" | "denied" {
  if (!accountNumber) {
    return "processing";
  }

  if (accountNumber === "0000000000") {
    return "failed";
  }

  if (accountNumber === "9999999999") {
    return "denied";
  }

  if (accountNumber === "1111111111") {
    return "complete";
  }

  return "processing";
}

function buildMockChannels(country?: string): YellowCardChannel[] {
  const seed: YellowCardChannel[] = [
    {
      id: "yc-channel-ng-bank",
      country: "NG",
      currency: "NGN",
      countryCurrency: "NGN",
      status: "active",
      widgetStatus: "active",
      apiStatus: "active",
      feeLocal: 185.2,
      feeUSD: 1.2,
      min: 100,
      max: 5000000,
      widgetMin: 100,
      widgetMax: 10000,
      channelType: "bank",
      rampType: "withdraw",
      settlementType: "instant",
      estimatedSettlementTime: 60,
    },
    {
      id: "yc-channel-gh-momo",
      country: "GH",
      currency: "GHS",
      countryCurrency: "GHS",
      status: "active",
      widgetStatus: "active",
      apiStatus: "active",
      feeLocal: 12,
      feeUSD: 0.8,
      min: 25,
      max: 250000,
      widgetMin: 25,
      widgetMax: 5000,
      channelType: "momo",
      rampType: "withdraw",
      settlementType: "instant",
      estimatedSettlementTime: 45,
    },
    {
      id: "yc-channel-ke-bank",
      country: "KE",
      currency: "KES",
      countryCurrency: "KES",
      status: "active",
      widgetStatus: "active",
      apiStatus: "active",
      feeLocal: 85,
      feeUSD: 0.6,
      min: 50,
      max: 350000,
      widgetMin: 50,
      widgetMax: 7500,
      channelType: "bank",
      rampType: "withdraw",
      settlementType: "instant",
      estimatedSettlementTime: 50,
    },
    {
      id: "yc-channel-zm-bank",
      country: "ZM",
      currency: "ZMW",
      countryCurrency: "ZMW",
      status: "active",
      widgetStatus: "active",
      apiStatus: "active",
      feeLocal: 18,
      feeUSD: 0.9,
      min: 20,
      max: 80000,
      widgetMin: 20,
      widgetMax: 2500,
      channelType: "bank",
      rampType: "withdraw",
      settlementType: "instant",
      estimatedSettlementTime: 90,
    },
  ];

  return country ? seed.filter((entry) => entry.country === country) : seed;
}

function buildMockNetworks(country?: string): YellowCardNetwork[] {
  const seed: YellowCardNetwork[] = [
    {
      id: "yc-network-ng-access",
      code: "044",
      country: "NG",
      name: "Access Bank",
      status: "active",
      accountNumberType: "bank",
      countryAccountNumberType: "NGBANK",
      channelIds: ["yc-channel-ng-bank"],
    },
    {
      id: "yc-network-gh-mtn",
      code: "MTN",
      country: "GH",
      name: "MTN Ghana",
      status: "active",
      accountNumberType: "momo",
      countryAccountNumberType: "GHMOMO",
      channelIds: ["yc-channel-gh-momo"],
    },
    {
      id: "yc-network-ke-kcb",
      code: "01",
      country: "KE",
      name: "KCB Kenya",
      status: "active",
      accountNumberType: "bank",
      countryAccountNumberType: "KEBANK",
      channelIds: ["yc-channel-ke-bank"],
    },
    {
      id: "yc-network-zm-zanaco",
      code: "01",
      country: "ZM",
      name: "Zanaco",
      status: "active",
      accountNumberType: "bank",
      countryAccountNumberType: "ZMBANK",
      channelIds: ["yc-channel-zm-bank"],
    },
  ];

  return country ? seed.filter((entry) => entry.country === country) : seed;
}

const mockCollections = new Map<string, MockCollectionRecord>();

export class YellowCardTestProvider implements YellowCardProvider {
  private readonly config = getYellowCardConfig();

  async getChannels(country?: string) {
    return buildMockChannels(country);
  }

  async getNetworks(country?: string) {
    return buildMockNetworks(country);
  }

  async getWidgetQuote(input: CreateWidgetQuoteInput) {
    const baseAmount = input.localAmount ?? Number((input.cryptoAmount ?? 0) * 1600);
    const serviceFeeLocal = Number((baseAmount * 0.01).toFixed(2));
    const partnerFeeLocal = Number((baseAmount * 0.0025).toFixed(2));
    const fiatReceived = Number((baseAmount - serviceFeeLocal - partnerFeeLocal).toFixed(2));
    const cryptoAmount = input.cryptoAmount ?? Number((baseAmount / 1600).toFixed(4));

    return {
      currency: input.currency,
      coin: input.coin,
      cryptoAmount,
      network: input.network,
      channelId: input.channelId,
      transactionType: input.transactionType,
      fiatReceived,
      convertedAmount: baseAmount,
      rateLocal: Number((baseAmount / cryptoAmount).toFixed(2)),
      serviceFeeLocal,
      serviceFeeUSD: Number((serviceFeeLocal / 1600).toFixed(2)),
      partnerFeeLocal,
      partnerFeeUSD: Number((partnerFeeLocal / 1600).toFixed(2)),
      paymentMethod: "local-collection",
      settlement: "instant",
      updatedAt: new Date().toISOString(),
      expireAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      transactionLimitMin: 100,
      transactionLimitMax: 5000000,
    };
  }

  async resolveBankAccount(input: ResolveBankAccountInput) {
    const mockName = `Mock Account ${generateDigits(
      `${this.config.apiKey}:${input.networkId}:${input.accountNumber}`,
      4
    )}`;

    return {
      accountNumber: input.accountNumber,
      accountName: mockName,
      accountBank: `Mock Network ${input.networkId.slice(-4).toUpperCase()}`,
    };
  }

  async submitCollectionRequest(input: YellowCardCollectionRequestInput) {
    const now = Date.now();
    const state = inferMockSettlementStatus(input.source.accountNumber);
    const seed = `${this.config.apiKey}:${input.sequenceId}`;
    const convertedAmount = Number((input.localAmount ?? (input.amount ?? 0) * 1600).toFixed(2));
    const rate =
      input.amount && input.amount > 0
        ? Number((convertedAmount / input.amount).toFixed(4))
        : 1600;
    const bankInfo =
      input.source.accountType === "bank"
        ? {
            name: `Mock ${input.country ?? "NG"} Collection Bank`,
            accountNumber: generateDigits(`${seed}:bank-account`, 10),
            accountName:
              input.recipient.businessName ??
              input.recipient.name ??
              "Renew Test Merchant",
          }
        : null;

    const record: MockCollectionRecord = {
      id: `yc-collection-${input.sequenceId}`,
      sequenceId: input.sequenceId,
      status: state,
      reference: buildMockReference(seed),
      depositId: buildMockDepositId(seed),
      customerUID: input.customerUID,
      channelId: input.channelId,
      currency: input.currency ?? "NGN",
      country: input.country ?? "NG",
      rate,
      convertedAmount,
      bankInfo,
      localAmount: input.localAmount ?? null,
      amount: input.amount ?? null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
    };

    mockCollections.set(record.id, record);
    mockCollections.set(record.sequenceId, record);

    return record;
  }

  async getCollectionById(collectionId: string) {
    const record = mockCollections.get(collectionId);

    if (!record) {
      throw new Error(`Mock collection ${collectionId} was not found.`);
    }

    return record;
  }

  async acceptCollectionRequest(collectionId: string) {
    const record = mockCollections.get(collectionId);

    if (!record) {
      throw new Error(`Mock collection ${collectionId} was not found.`);
    }

    if (record.status === "denied" || record.status === "failed") {
      return record;
    }

    const now = new Date().toISOString();
    const nextStatus = record.status === "complete" ? "complete" : "processing";
    const updatedRecord: MockCollectionRecord = {
      ...record,
      status: nextStatus,
      updatedAt: now,
    };

    mockCollections.set(record.id, updatedRecord);
    mockCollections.set(record.sequenceId, updatedRecord);

    return updatedRecord;
  }

  async denyCollectionRequest(collectionId: string) {
    const record = mockCollections.get(collectionId);

    if (!record) {
      throw new Error(`Mock collection ${collectionId} was not found.`);
    }

    const now = new Date().toISOString();
    const updatedRecord: MockCollectionRecord = {
      ...record,
      status: "denied",
      updatedAt: now,
    };

    mockCollections.set(record.id, updatedRecord);
    mockCollections.set(record.sequenceId, updatedRecord);

    return updatedRecord;
  }
}
