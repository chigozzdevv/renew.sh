import type { FeatureCard, FlowStep, NavItem, ProofItem } from "@/types/marketing";

export const landingNav: NavItem[] = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
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
    eyebrow: "Billing",
    title: "Issue invoices with stablecoin-native payment intent.",
    body:
      "Generate payment sessions with exact token amounts, expiry windows, and payer-safe metadata so merchants control the billing contract, not the browser."
  },
  {
    eyebrow: "Settlement",
    title: "Track the chain, but trust reconciled backend state.",
    body:
      "The UI can show pending writes and receipts, while your backend remains the source of truth for invoice settlement, confirmations, and retries."
  },
  {
    eyebrow: "Treasury",
    title: "Move from checkout to treasury visibility without a handoff.",
    body:
      "Give finance teams a clear view of payment status, token flows, and account-level exposure from the same system merchants use to collect."
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
