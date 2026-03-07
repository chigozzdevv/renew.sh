"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/dashboard/ui";
import { ApiError } from "@/lib/api";

export function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatCurrency(value: number, currency = "USDC") {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function statusTone(
  status: string
): "neutral" | "brand" | "warning" | "danger" {
  if (
    ["active", "healthy", "settled", "approved", "executed", "ok", "delivered"].includes(
      status
    )
  ) {
    return "brand";
  }

  if (
    ["pending", "confirming", "awaiting_settlement", "invited"].includes(status)
  ) {
    return "warning";
  }

  if (
    ["failed", "reversed", "blacklisted", "error", "suspended", "revoked"].includes(
      status
    )
  ) {
    return "danger";
  }

  return "neutral";
}

export function StatusBadge({
  value,
  children,
}: {
  value: string;
  children?: ReactNode;
}) {
  return (
    <Badge tone={statusTone(value)}>
      {children ?? value.replace(/_/g, " ")}
    </Badge>
  );
}

export function toErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}
