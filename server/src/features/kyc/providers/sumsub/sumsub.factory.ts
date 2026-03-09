import { SumsubLiveProvider } from "@/features/kyc/providers/sumsub/sumsub.live";
import type { SumsubProvider } from "@/features/kyc/providers/sumsub/sumsub.types";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

let liveProvider: SumsubProvider | null = null;

export function getSumsubProvider(mode: RuntimeMode): SumsubProvider {
  if (mode !== "live") {
    throw new Error("Sumsub is only available in live mode.");
  }

  if (!liveProvider) {
    liveProvider = new SumsubLiveProvider("live");
  }

  return liveProvider;
}
