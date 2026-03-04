import { getYellowCardConfig } from "@/config/yellow-card.config";
import type {
  CreateWidgetQuoteInput,
  ResolveBankAccountInput,
} from "@/features/payment-rails/payment-rails.validation";

type YellowCardChannel = {
  id: string;
  country: string;
  currency: string;
  countryCurrency: string;
  status: string;
  widgetStatus?: string;
  apiStatus?: string;
  feeLocal?: number;
  feeUSD?: number;
  min?: number;
  max?: number;
  widgetMin?: number;
  widgetMax?: number;
  channelType: string;
  rampType: string;
  settlementType?: string;
  estimatedSettlementTime?: number;
};

type YellowCardNetwork = {
  id: string;
  code?: string;
  country: string;
  name: string;
  status: string;
  accountNumberType?: string;
  countryAccountNumberType?: string;
  channelIds?: string[];
};

export type YellowCardCollectionRequestInput = {
  channelId: string;
  sequenceId: string;
  amount?: number;
  localAmount?: number;
  customerUID: string;
  customerType: "retail" | "institution";
  recipient: {
    businessId?: string;
    businessName?: string;
    name?: string;
    country?: string;
    address?: string;
    dob?: string;
    email?: string;
    idNumber?: string;
    idType?: string;
    additionalIdType?: string;
    additionalIdNumber?: string;
    phone?: string;
  };
  source: {
    accountType: "bank" | "momo";
    accountNumber?: string;
    networkId?: string;
  };
  forceAccept?: boolean;
};

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

export class YellowCardClient {
  private readonly config = getYellowCardConfig();

  async getChannels(country?: string) {
    if (this.config.mockMode) {
      return buildMockChannels(country);
    }

    const searchParams = new URLSearchParams();

    if (country) {
      searchParams.set("country", country);
    }

    return this.requestJson<YellowCardChannel[]>(
      `/channels${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    );
  }

  async getNetworks(country?: string) {
    if (this.config.mockMode) {
      return buildMockNetworks(country);
    }

    const searchParams = new URLSearchParams();

    if (country) {
      searchParams.set("country", country);
    }

    return this.requestJson<YellowCardNetwork[]>(
      `/networks${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
    );
  }

  async getWidgetQuote(input: CreateWidgetQuoteInput) {
    if (this.config.mockMode) {
      const baseAmount =
        input.localAmount ?? Number((input.cryptoAmount ?? 0) * 1600);
      const serviceFeeLocal = Number((baseAmount * 0.01).toFixed(2));
      const partnerFeeLocal = Number((baseAmount * 0.0025).toFixed(2));
      const fiatReceived = Number(
        (baseAmount - serviceFeeLocal - partnerFeeLocal).toFixed(2)
      );
      const cryptoAmount =
        input.cryptoAmount ?? Number((baseAmount / 1600).toFixed(4));

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

    return this.requestJson<Record<string, unknown>>("/widget/quote", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async resolveBankAccount(input: ResolveBankAccountInput) {
    if (this.config.mockMode) {
      return {
        accountNumber: input.accountNumber,
        accountName: "Verified Account",
        accountBank: "Verified Network",
      };
    }

    return this.requestJson<Record<string, unknown>>("/details/bank", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async submitCollectionRequest(input: YellowCardCollectionRequestInput) {
    if (this.config.mockMode) {
      const now = Date.now();

      return {
        id: `yc-collection-${input.sequenceId}`,
        sequenceId: input.sequenceId,
        status:
          input.source.accountNumber === "0000000000" ? "failed" : "processing",
        customerUID: input.customerUID,
        channelId: input.channelId,
        localAmount: input.localAmount ?? null,
        amount: input.amount ?? null,
        createdAt: new Date(now).toISOString(),
        expireAt: new Date(now + 10 * 60 * 1000).toISOString(),
      };
    }

    return this.requestJson<Record<string, unknown>>("/collections", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  private async requestJson<T>(
    path: string,
    options?: {
      method?: "GET" | "POST";
      body?: string;
    }
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: options?.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.config.apiKey,
          [this.config.timestampHeader]: new Date().toISOString(),
        },
        body: options?.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          `Yellow Card request failed with status ${response.status}: ${message}`
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
