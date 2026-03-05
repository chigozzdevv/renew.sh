import { SumsubLiveProvider } from "@/features/kyc/providers/sumsub/sumsub.live";
import { SumsubTestProvider } from "@/features/kyc/providers/sumsub/sumsub.test";
import type { SumsubProvider } from "@/features/kyc/providers/sumsub/sumsub.types";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

const providerInstances = new Map<RuntimeMode, SumsubProvider>();

export function getSumsubProvider(mode: RuntimeMode): SumsubProvider {
  const existingProvider = providerInstances.get(mode);

  if (existingProvider) {
    return existingProvider;
  }

  const provider =
    mode === "live"
      ? new SumsubLiveProvider(mode)
      : new SumsubTestProvider(mode);
  providerInstances.set(mode, provider);

  return provider;
}
