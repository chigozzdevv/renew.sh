import type { FeatureCard, FlowStep, NavItem, ProofItem } from "@/types/marketing";

export const landingNav: NavItem[] = [
  { label: "Overview", href: "#overview" },
  { label: "Why Renew", href: "#why-renew" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Avalanche", href: "#network" },
];

export const proofItems: ProofItem[] = [
  { value: "24/7", label: "always-on settlement" },
  { value: "C-Chain", label: "native Avalanche execution" },
  { value: "USDC+", label: "stablecoin-ready invoice rails" },
  { value: "<60s", label: "operator confirmation loop" }
];

export const supportedBillingCurrencies = [
  { code: "NGN", symbol: "\u20A6" },
  { code: "KES", symbol: "KSh" },
  { code: "UGX", symbol: "USh" },
  { code: "XAF", symbol: "FCFA" },
  { code: "MWK", symbol: "MK" },
  { code: "ZAR", symbol: "R" },
  { code: "ZMW", symbol: "ZK" },
  { code: "RWF", symbol: "FRw" },
  { code: "XOF", symbol: "CFA" },
  { code: "BWP", symbol: "P" },
  { code: "CDF", symbol: "FC" },
  { code: "TZS", symbol: "TSh" },
  { code: "GHS", symbol: "GH\u20B5" },
] as const;

export const featureCards: FeatureCard[] = [
  {
    eyebrow: "Local pricing",
    title: "Keep checkout in local fiat.",
    body: "Customers see familiar pricing."
  },
  {
    eyebrow: "USDC settlement",
    title: "Land treasury in USDC.",
    body: "Every charge settles on Avalanche."
  },
  {
    eyebrow: "Recurring billing",
    title: "Run renewals on one rail.",
    body: "Subscriptions stay automated."
  },
  {
    eyebrow: "Usage-based billing",
    title: "Meter and settle together.",
    body: "Usage charges follow the same flow."
  }
];

export const flowSteps: FlowStep[] = [
  {
    title: "Set a price",
    body: "Choose the amount, billing interval, and rules. Renew handles conversion into the customer's local fiat at checkout."
  },
  {
    title: "Collect the charge",
    body: "Customers pay in familiar local fiat while Renew routes the charge into a settlement-ready payment flow behind the scenes."
  },
  {
    title: "Settle and reconcile",
    body: "Funds land in USDC on Avalanche, with status updates ready for renewals, retries, and finance visibility."
  }
];
