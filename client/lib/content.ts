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
    title: "Charge customers in the currency they already understand.",
    body:
      "Renew lets merchants price subscriptions in local fiat so checkout stays familiar while the system handles the conversion layer behind the scenes."
  },
  {
    eyebrow: "USDC settlement",
    title: "Settle every payment in USDC on Avalanche.",
    body:
      "You keep stablecoin settlement at the treasury layer without forcing customers to pay in crypto or exposing operators to manual reconciliation."
  },
  {
    eyebrow: "Flexible billing",
    title: "Support recurring and usage-based billing from one rail.",
    body:
      "From monthly plans to metered charges, the same billing infrastructure can power repeated collections and programmable settlement logic."
  }
];

export const flowSteps: FlowStep[] = [
  {
    title: "Create a payment session",
    body: "Your backend defines the invoice amount, accepted stablecoin, expiry, and metadata for the payer."
  },
  {
    title: "Route the wallet flow",
    body: "The client checks the connected wallet, enforces Avalanche C-Chain, verifies balance, and requests allowance only if needed."
  },
  {
    title: "Submit and reconcile",
    body: "The payer signs once, the transaction confirms on-chain, and backend reconciliation marks the invoice settled."
  }
];
