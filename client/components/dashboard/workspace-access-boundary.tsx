"use client";

import type { ReactNode } from "react";

import { LiveOnboardingGate } from "@/components/dashboard/live-onboarding-gate";
import { useWorkspaceMode } from "@/components/dashboard/mode-provider";

export function DashboardWorkspaceAccessBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const { mode } = useWorkspaceMode();

  if (mode === "live") {
    return <LiveOnboardingGate />;
  }

  return <>{children}</>;
}
