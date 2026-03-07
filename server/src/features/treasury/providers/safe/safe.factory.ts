import type { RuntimeMode } from "@/shared/constants/runtime-mode";

import { SafeLiveProvider } from "@/features/treasury/providers/safe/safe.live";
import { SafeTestnetProvider } from "@/features/treasury/providers/safe/safe.testnet";
import type { SafeProvider } from "@/features/treasury/providers/safe/safe.types";

export function createSafeProvider(mode: RuntimeMode): SafeProvider {
  if (mode === "live") {
    return new SafeLiveProvider();
  }

  return new SafeTestnetProvider();
}
