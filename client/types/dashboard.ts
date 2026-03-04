export type DashboardRouteKey =
  | "overview"
  | "customers"
  | "plans"
  | "subscriptions"
  | "payments"
  | "treasury"
  | "teams"
  | "developers"
  | "audit"
  | "settings";

export type DashboardNavItem = {
  key: DashboardRouteKey;
  label: string;
  href: string;
  icon:
    | "home"
    | "users"
    | "stack"
    | "refresh"
    | "card"
    | "vault"
    | "team"
    | "code"
    | "shield"
    | "gear";
};

export type DashboardStat = {
  label: string;
  value: string;
  note: string;
  tone?: "brand" | "neutral";
};

export type DashboardPageContent = {
  key: DashboardRouteKey;
  title: string;
  description: string;
  actions: string[];
  stats: DashboardStat[];
};
