import { env } from "@/config/env.config";
import { YellowCardLiveProvider } from "@/features/payment-rails/providers/yellow-card/yellow-card.live";
import { YellowCardTestProvider } from "@/features/payment-rails/providers/yellow-card/yellow-card.test";
import type { YellowCardProvider } from "@/features/payment-rails/providers/yellow-card/yellow-card.types";

let providerInstance: YellowCardProvider | null = null;

export function getYellowCardProvider(): YellowCardProvider {
  if (providerInstance) {
    return providerInstance;
  }

  providerInstance =
    env.PAYMENT_ENV === "live"
      ? new YellowCardLiveProvider()
      : new YellowCardTestProvider();

  return providerInstance;
}
