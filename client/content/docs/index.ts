export type DocsCategoryId = "guides" | "api" | "sdk";

export type CodeLanguage = "bash" | "ts" | "json" | "sol";

export type DocsReference = {
  label: string;
  value: string;
  detail: string;
};

export type DocsSample = {
  label: string;
  language: CodeLanguage;
  filename?: string;
  code: string;
};

export type DocsArticleSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
  references?: DocsReference[];
  sample?: DocsSample;
  samples?: DocsSample[];
};

export type DocsPage = {
  id: string;
  category: DocsCategoryId;
  group: string;
  navTitle: string;
  title: string;
  description: string;
  sections: DocsArticleSection[];
};

export type DocsCategory = {
  id: DocsCategoryId;
  label: string;
};

export const docsCategories: DocsCategory[] = [
  { id: "guides", label: "Guides" },
  { id: "api", label: "API Reference" },
  { id: "sdk", label: "SDK Reference" },
];

const docsPageOrder: Record<DocsCategoryId, string[]> = {
  guides: [
    "guide-quickstart",
    "guide-auth",
    "guide-overview",
    "guide-checkout",
    "guide-plans",
    "guide-customers",
    "guide-subscriptions",
    "guide-renewals",
    "guide-webhooks",
    "guide-go-live",
    "guide-sdk",
  ],
  api: [
    "api-auth",
    "api-checkout",
    "api-plans",
    "api-customers",
    "api-subscriptions",
    "api-renewals",
    "api-webhooks",
  ],
  sdk: ["sdk-overview", "sdk-clients"],
};

function createJsonSample(
  label: string,
  filename: string,
  value: Record<string, unknown>,
): DocsSample {
  return {
    label,
    language: "json",
    filename,
    code: JSON.stringify(value, null, 2),
  };
}

export const docsPages: DocsPage[] = [
  {
    id: "guide-overview",
    category: "guides",
    group: "Core concepts",
    navTitle: "How it works",
    title: "How Renew works",
    description:
      "Understand the three parts of a Renew integration: checkout, workspace operations, and webhooks.",
    sections: [
      {
        id: "guide-overview-flow",
        title: "The product flow",
        paragraphs: [
          "A typical integration starts in checkout, continues in the workspace APIs, and stays in sync through webhooks.",
        ],
        bullets: [
          "Checkout creates the first subscription from a plan and a customer billing payload.",
          "Workspace APIs let your team manage plans, customers, subscriptions, charges, and retries after signup.",
          "Webhooks push billing outcomes such as `charge.settled` and `charge.failed` back into your systems.",
        ],
      },
      {
        id: "guide-overview-surfaces",
        title: "Base endpoints",
        paragraphs: [
          "These are the entry points you will touch first when wiring up an integration.",
        ],
        references: [
          {
            label: "GET",
            value: "/health",
            detail: "Health check for monitoring.",
          },
          {
            label: "GET",
            value: "/v1/protocol",
            detail: "Runtime metadata such as network and active contract addresses.",
          },
          {
            label: "Checkout",
            value: "/v1/checkout",
            detail: "Customer-facing checkout flow using a server key first and then a short-lived client secret.",
          },
          {
            label: "Workspace",
            value: "/v1/customers, /v1/plans, /v1/subscriptions, /v1/charges",
            detail: "Bearer-authenticated endpoints for your admin, ops, and finance tools.",
          },
        ],
      },
      {
        id: "guide-overview-order",
        title: "Recommended reading order",
        paragraphs: [
          "If you are starting from scratch, read the guides in this order.",
        ],
        bullets: [
          "Quickstart: create a sandbox checkout session and complete a payment.",
          "Authentication: choose the right credential for each surface.",
          "Checkout flow: understand session state, next actions, and customer submission.",
          "Webhooks: subscribe to billing events before you switch on live traffic.",
        ],
      },
    ],
  },
  {
    id: "guide-quickstart",
    category: "guides",
    group: "Start here",
    navTitle: "Quickstart",
    title: "Quickstart",
    description:
      "Create a sandbox checkout session and complete a payment end to end.",
    sections: [
      {
        id: "guide-quickstart-prereqs",
        title: "Before you begin",
        paragraphs: [
          "Before you start, prepare one active sandbox plan and one sandbox server key. Your backend uses the server key to create the checkout session. The response then gives you a client secret for the customer-facing step.",
        ],
        bullets: [
          "An active plan in sandbox mode.",
          "A sandbox server key with the `rw_test_` prefix.",
          "A backend endpoint that can create a checkout session and return the `clientSecret` to your checkout UI.",
        ],
      },
      {
        id: "guide-quickstart-flow",
        title: "Flow",
        paragraphs: [
          "The shortest successful path is: list plans, create a checkout session for one plan, fetch that session with the returned client secret, submit customer details, then complete the payment simulation in sandbox mode.",
          "Submitting the customer payload creates or updates the customer record, creates the subscription snapshot, and moves the session into the next payment step.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/plans",
            detail: "Requires a server key. Returns active plans for that merchant and environment.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions",
            detail: "Requires a server key. Send `planId` and optionally `expiresInMinutes` or metadata.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/customer",
            detail: "Requires the checkout client secret. Send customer identity and payment routing fields.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/test-complete",
            detail: "Requires the checkout client secret. Available only for sandbox sessions waiting on payment completion.",
          },
        ],
      },
    ],
  },
  {
    id: "guide-auth",
    category: "guides",
    group: "Start here",
    navTitle: "Authentication",
    title: "Authentication",
    description:
      "Choose the right credential for each surface and keep sandbox and live traffic separate.",
    sections: [
      {
        id: "guide-auth-types",
        title: "Three credential types",
        paragraphs: [
          "Renew uses three credential types, and each one maps to a different surface. Most early auth errors come from sending the right token to the wrong endpoint.",
        ],
        bullets: [
          "Use a bearer JWT for workspace APIs such as customers, plans, subscriptions, charges, keys, and webhooks.",
          "Use a Renew server key for backend checkout requests. These keys start with `rw_test_` or `rw_live_`.",
          "Use a checkout client secret only for one customer checkout flow. These values start with `rcs_`.",
        ],
      },
      {
        id: "guide-auth-environments",
        title: "Environment matching",
        paragraphs: [
          "Server keys are environment-specific. Use `rw_test_` keys with sandbox traffic and `rw_live_` keys with live traffic. Keep plans, customers, subscriptions, charges, webhooks, and delivery logs separated by environment.",
          "Use `/v1/protocol` when your backend needs runtime metadata such as the active network or contract addresses before it creates SDK clients.",
        ],
        references: [
          {
            label: "GET",
            value: "/health",
            detail: "Simple public health check for service monitoring.",
          },
          {
            label: "GET",
            value: "/v1/protocol",
            detail: "Public runtime status, network, and config metadata.",
          },
          {
            label: "GET",
            value: "/v1/developers/keys",
            detail: "List existing server keys for a merchant workspace.",
          },
          {
            label: "POST",
            value: "/v1/developers/keys",
            detail: "Create a server key and receive the raw token once.",
          },
        ],
      },
      {
        id: "guide-auth-headers",
        title: "Request header patterns",
        paragraphs: [
          "Server keys and checkout client secrets can be sent either as explicit Renew headers or as bearer tokens. The explicit headers are usually easier to read in logs and API clients.",
        ],
        samples: [
          createJsonSample("Server key in explicit header", "server-key-header.request.json", {
            method: "GET",
            path: "/v1/checkout/plans",
            headers: {
              "x-renew-secret-key": "rw_test_xxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
          createJsonSample("Server key as bearer token", "server-key-bearer.request.json", {
            method: "GET",
            path: "/v1/checkout/plans",
            headers: {
              Authorization: "Bearer rw_test_xxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
          createJsonSample("Client secret in explicit header", "client-secret-header.request.json", {
            method: "GET",
            path: "/v1/checkout/sessions/64f8d430f1d2c11d0e63ba13",
            headers: {
              "x-renew-client-secret":
                "rcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
          createJsonSample("Client secret as bearer token", "client-secret-bearer.request.json", {
            method: "GET",
            path: "/v1/checkout/sessions/64f8d430f1d2c11d0e63ba13",
            headers: {
              Authorization:
                "Bearer rcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-checkout",
    category: "guides",
    group: "Core concepts",
    navTitle: "Checkout flow",
    title: "Checkout flow",
    description:
      "Move a customer from plan selection to an active subscription using a short-lived checkout client secret.",
    sections: [
      {
        id: "guide-checkout-server",
        title: "Server-side checkout flow",
        paragraphs: [
          "Your backend starts checkout. It lists active plans, creates a session for one plan, and returns the resulting `clientSecret` to the customer-facing component that will continue the flow.",
          "Session creation snapshots the plan terms at that moment, sets an expiry between 5 and 120 minutes, and isolates the client secret to a single checkout session.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/plans",
            detail: "List active plans for the current server key and workspace environment.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions",
            detail: "Create a checkout session with `planId`, optional `expiresInMinutes`, and optional metadata.",
          },
        ],
      },
      {
        id: "guide-checkout-customer",
        title: "Customer session flow",
        paragraphs: [
          "Once the customer-facing step has the session ID and client secret, it can read session state and submit the customer payload required to create the subscription snapshot.",
          "The customer payload accepts `name`, `email`, `market`, `paymentAccountType`, `paymentAccountNumber`, `paymentNetworkId`, and optional metadata.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/sessions/:sessionId",
            detail: "Read the current checkout session, including `status`, `nextAction`, and any payment instructions.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/customer",
            detail: "Submit customer identity and payment routing details.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/test-complete",
            detail: "Advance a sandbox session from `pending_payment` to a completed payment state.",
          },
        ],
      },
      {
        id: "guide-checkout-lifecycle",
        title: "Session lifecycle",
        paragraphs: [
          "Checkout sessions move through a small set of statuses so your UI can react predictably. The response also includes `nextAction`, payment instructions, and sandbox-mode hints where appropriate.",
        ],
        bullets: [
          "`open`: waiting for customer details.",
          "`scheduled`: subscription created, waiting for the next charge step.",
          "`pending_payment`: a payment is expected or in progress.",
          "`processing`: waiting for settlement progress.",
          "`settled`: billing succeeded for the session.",
          "`failed` or `expired`: session cannot continue without a new attempt.",
        ],
      },
      {
        id: "guide-checkout-example",
        title: "Checkout session example",
        paragraphs: [
          "The most important handoff is the create-session response, because it contains both the session ID and the short-lived client secret.",
        ],
        samples: [
          createJsonSample("Create checkout session request", "checkout-session.request.json", {
            method: "POST",
            path: "/v1/checkout/sessions",
            headers: {
              "x-renew-secret-key": "rw_test_xxxxxxxxxxxxxxxxxxxxxxxx",
              "Content-Type": "application/json",
            },
            body: {
              planId: "64f8c8a8f1d2c11d0e63b6a3",
              expiresInMinutes: 30,
              metadata: {
                source: "pricing-page",
              },
            },
          }),
          createJsonSample("Create checkout session response", "checkout-session.response.json", {
            success: true,
            message: "Checkout session created.",
            data: {
              clientSecret: "rcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
              session: {
                id: "64f8d430f1d2c11d0e63ba13",
                environment: "sandbox",
                status: "open",
                nextAction: "submit_customer",
                expiresAt: "2026-03-08T12:30:00.000Z",
                plan: {
                  id: "64f8c8a8f1d2c11d0e63b6a3",
                  planCode: "PRO_MONTHLY",
                  name: "Pro Monthly",
                  usdAmount: 99,
                  billingIntervalDays: 30,
                  trialDays: 7,
                  retryWindowHours: 24,
                  billingMode: "fixed",
                  supportedMarkets: ["NGN", "KES"],
                },
              },
            },
          }),
          createJsonSample("Read checkout session request", "checkout-session-read.request.json", {
            method: "GET",
            path: "/v1/checkout/sessions/64f8d430f1d2c11d0e63ba13",
            headers: {
              "x-renew-client-secret":
                "rcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-customers",
    category: "guides",
    group: "Billing operations",
    navTitle: "Customers",
    title: "Customers",
    description:
      "Create customer records, update billing health, and control customer lifecycle changes.",
    sections: [
      {
        id: "guide-customers-records",
        title: "Customer records",
        paragraphs: [
          "Customer records are the long-lived billing identity your team works from after checkout. Keep a stable `customerRef` from your own system so support, finance, and product data can reconcile the same account.",
          "Renew stores market, billing state, payment method state, renewal timing, and metadata alongside that identity so operators can inspect billing health without reconstructing it from raw charges.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/customers",
            detail: "List customers by merchant, market, status, or search term.",
          },
          {
            label: "POST",
            value: "/v1/customers",
            detail: "Create a customer with `merchantId`, `customerRef`, `name`, `email`, and `market`.",
          },
          {
            label: "PATCH",
            value: "/v1/customers/:customerId",
            detail: "Update editable fields such as `billingState`, `paymentMethodState`, reminders, or metadata.",
          },
        ],
      },
      {
        id: "guide-customers-actions",
        title: "Customer lifecycle actions",
        paragraphs: [
          "Pause, resume, and blacklist actions are explicit endpoints rather than implicit status toggles. That keeps customer billing controls safer and easier to audit.",
        ],
        references: [
          {
            label: "POST",
            value: "/v1/customers/:customerId/pause",
            detail: "Pause billing for a customer.",
          },
          {
            label: "POST",
            value: "/v1/customers/:customerId/resume",
            detail: "Resume a paused customer.",
          },
          {
            label: "POST",
            value: "/v1/customers/:customerId/blacklist",
            detail: "Block billing activity for a customer with a reason.",
          },
        ],
      },
      {
        id: "guide-customers-example",
        title: "Customer example",
        paragraphs: [
          "Use customer creation for operator-led imports or backfills. Use the patch endpoint to keep billing health in sync with what your team knows about the account.",
        ],
        samples: [
          createJsonSample("Create customer request", "create-customer.request.json", {
            method: "POST",
            path: "/v1/customers",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
              customerRef: "cust_ngozi_001",
              name: "Ngozi Foods",
              email: "finance@ngozi.example",
              market: "NGN",
              actor: "Ada Operations",
            },
          }),
          createJsonSample("Update customer request", "update-customer.request.json", {
            method: "PATCH",
            path: "/v1/customers/64f8c9d0f1d2c11d0e63b754",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              billingState: "healthy",
              paymentMethodState: "ok",
              autoReminderEnabled: true,
              actor: "Ada Operations",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-plans",
    category: "guides",
    group: "Billing operations",
    navTitle: "Plans",
    title: "Plans",
    description:
      "Create the plan catalog your customers can subscribe to.",
    sections: [
      {
        id: "guide-plans-catalog",
        title: "Plan catalog design",
        paragraphs: [
          "Plans define the commercial terms checkout will snapshot onto each subscription: price, interval, trial period, retry window, billing mode, and supported markets.",
          "Treat an active plan as customer-facing product configuration. If you are still reviewing the pricing or availability, keep it in draft until it is ready to sell.",
        ],
        bullets: [
          "Use fixed plans for flat recurring pricing.",
          "Use metered plans when usage is part of the billing model.",
          "Only active plans are returned by checkout plan listing.",
        ],
      },
      {
        id: "guide-plans-states",
        title: "Plan lifecycle",
        paragraphs: [
          "Plans can move through draft, active, and archived states. Only active plans should be surfaced to customer checkout.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/plans",
            detail: "List plans for a merchant workspace.",
          },
          {
            label: "POST",
            value: "/v1/plans",
            detail: "Create a plan.",
          },
          {
            label: "PATCH",
            value: "/v1/plans/:planId",
            detail: "Update plan details or status.",
          },
        ],
      },
      {
        id: "guide-plans-example",
        title: "Plan example",
        paragraphs: [
          "This request creates an active monthly plan available in two local markets.",
        ],
        samples: [
          createJsonSample("Create plan request", "create-plan.request.json", {
            method: "POST",
            path: "/v1/plans",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
              planCode: "PRO_MONTHLY",
              name: "Pro Monthly",
              usdAmount: 99,
              billingIntervalDays: 30,
              trialDays: 7,
              retryWindowHours: 24,
              billingMode: "fixed",
              supportedMarkets: ["NGN", "KES"],
              status: "active",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-subscriptions",
    category: "guides",
    group: "Billing operations",
    navTitle: "Subscriptions",
    title: "Subscriptions",
    description:
      "Create subscriptions and manage the billing snapshot used for renewals.",
    sections: [
      {
        id: "guide-subscriptions-role",
        title: "What subscriptions hold",
        paragraphs: [
          "Subscriptions connect one customer to one plan and preserve the billing snapshot Renew will use for future renewals. That snapshot includes billing currency, local amount, payment account details, and the next charge timestamp.",
          "Because the subscription stores its own billing snapshot, you can change the plan catalog later without losing the terms already promised to a subscriber.",
        ],
      },
      {
        id: "guide-subscriptions-ops",
        title: "Create and update subscriptions",
        paragraphs: [
          "Subscriptions can be created directly through the workspace API or indirectly as part of checkout. Once created, you can update status, timing, retry availability, and payment routing details as billing operations change.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/subscriptions",
            detail: "List subscriptions by merchant, plan, status, or search term.",
          },
          {
            label: "POST",
            value: "/v1/subscriptions",
            detail: "Create a subscription directly.",
          },
          {
            label: "PATCH",
            value: "/v1/subscriptions/:subscriptionId",
            detail: "Update status, timing, or payment routing.",
          },
        ],
      },
      {
        id: "guide-subscriptions-example",
        title: "Subscription example",
        paragraphs: [
          "This example creates a subscription directly, then moves the next charge date forward.",
        ],
        samples: [
          createJsonSample("Create subscription request", "create-subscription.request.json", {
            method: "POST",
            path: "/v1/subscriptions",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
              planId: "64f8c8a8f1d2c11d0e63b6a3",
              customerRef: "cust_ngozi_001",
              customerName: "Ngozi Foods",
              billingCurrency: "NGN",
              localAmount: 154000,
              paymentAccountType: "bank",
              paymentAccountNumber: "0123456789",
              paymentNetworkId: "nibss-ngn",
              status: "active",
              nextChargeAt: "2026-03-10T08:00:00.000Z",
            },
          }),
          createJsonSample("Update subscription request", "update-subscription.request.json", {
            method: "PATCH",
            path: "/v1/subscriptions/64f8c9a0f1d2c11d0e63b741",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              nextChargeAt: "2026-03-12T08:00:00.000Z",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-renewals",
    category: "guides",
    group: "Billing operations",
    navTitle: "Charges & renewals",
    title: "Charges & renewals",
    description:
      "Queue renewals, inspect charge outcomes, and retry failed billing attempts.",
    sections: [
      {
        id: "guide-renewals-queue",
        title: "Trigger the next renewal",
        paragraphs: [
          "Use the queue-charge action when you want Renew to advance billing from the subscription itself. This is the cleanest way to trigger the next renewal without creating a separate charge record by hand first.",
        ],
        references: [
          {
            label: "POST",
            value: "/v1/subscriptions/:subscriptionId/queue-charge",
            detail: "Queue the next renewal charge for a subscription.",
          },
        ],
      },
      {
        id: "guide-renewals-charges",
        title: "Inspect and retry charges",
        paragraphs: [
          "Charge records capture the amount, FX rate, fees, failure code, processing time, and current status of a billing attempt. They are usually the first place to look when a renewal succeeds, fails, or needs a retry.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/charges",
            detail: "List charges by merchant, subscription, status, or search term.",
          },
          {
            label: "POST",
            value: "/v1/charges",
            detail: "Create a charge record directly.",
          },
          {
            label: "PATCH",
            value: "/v1/charges/:chargeId",
            detail: "Update charge status or failure fields.",
          },
          {
            label: "POST",
            value: "/v1/charges/:chargeId/retry",
            detail: "Retry a failed charge.",
          },
        ],
      },
      {
        id: "guide-renewals-example",
        title: "Renewal example",
        paragraphs: [
          "These requests queue the next charge and then fetch recent charge activity for the same merchant.",
        ],
        samples: [
          createJsonSample("Queue charge request", "queue-charge.request.json", {
            method: "POST",
            path: "/v1/subscriptions/64f8c9a0f1d2c11d0e63b741/queue-charge",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
            },
          }),
          createJsonSample("List charges request", "list-charges.request.json", {
            method: "GET",
            path: "/v1/charges",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
            },
            query: {
              merchantId: "64f8c60af1d2c11d0e63b531",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-webhooks",
    category: "guides",
    group: "Integrations",
    navTitle: "Webhooks",
    title: "Webhooks",
    description:
      "Register webhook endpoints, send test deliveries, and inspect delivery logs.",
    sections: [
      {
        id: "guide-webhooks-register",
        title: "Register webhook endpoints",
        paragraphs: [
          "Webhook endpoints are how Renew pushes billing outcomes back into your systems. Register a URL, choose the event types you care about, and set a retry policy that matches how reliable your downstream consumer is.",
          "Typical billing events to start with are `charge.settled` and `charge.failed`. You can update the endpoint later without recreating the integration from scratch.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/developers/webhooks",
            detail: "List registered webhook endpoints.",
          },
          {
            label: "POST",
            value: "/v1/developers/webhooks",
            detail: "Create a webhook endpoint.",
          },
          {
            label: "PATCH",
            value: "/v1/developers/webhooks/:webhookId",
            detail: "Update endpoint URL, status, event types, or retry policy.",
          },
        ],
      },
      {
        id: "guide-webhooks-ops",
        title: "Rotate secrets and inspect deliveries",
        paragraphs: [
          "Secrets can be rotated without recreating the webhook endpoint. Delivery logs let you inspect whether a test or production attempt was delivered, failed, or queued.",
        ],
        references: [
          {
            label: "POST",
            value: "/v1/developers/webhooks/:webhookId/rotate-secret",
            detail: "Rotate the webhook secret.",
          },
          {
            label: "POST",
            value: "/v1/developers/webhooks/:webhookId/test",
            detail: "Send a test delivery for one event type.",
          },
          {
            label: "GET",
            value: "/v1/developers/deliveries",
            detail: "Inspect webhook delivery attempts.",
          },
        ],
      },
      {
        id: "guide-webhooks-example",
        title: "Webhook example",
        paragraphs: [
          "This example registers a webhook endpoint and immediately sends a test delivery for one event type.",
        ],
        samples: [
          createJsonSample("Create webhook request", "create-webhook.request.json", {
            method: "POST",
            path: "/v1/developers/webhooks",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
              label: "Billing events",
              endpointUrl: "https://api.acme.example/renew/webhooks",
              eventTypes: ["charge.settled", "charge.failed"],
              retryPolicy: "exponential",
            },
          }),
          createJsonSample("Send test delivery request", "test-webhook.request.json", {
            method: "POST",
            path: "/v1/developers/webhooks/64f8cb9df1d2c11d0e63b8e1/test",
            headers: {
              Authorization: "Bearer {{RENEW_JWT}}",
              "Content-Type": "application/json",
            },
            body: {
              merchantId: "64f8c60af1d2c11d0e63b531",
              eventType: "charge.settled",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "guide-sdk",
    category: "guides",
    group: "Optional SDK",
    navTitle: "When to use it",
    title: "When to use the SDK",
    description:
      "The API is enough for most integrations. Use the SDK only for typed backend helpers and reconciliation jobs.",
    sections: [
      {
        id: "guide-sdk-when",
        title: "When the SDK is useful",
        paragraphs: [
          "You do not need the SDK to integrate checkout, manage plans, create subscriptions, run renewals, or register webhooks. Those flows are already covered by the platform API.",
          "The SDK becomes useful when your backend needs typed helpers for runtime configuration, balance lookups, or shared event and record types in your own services or jobs.",
        ],
        bullets: [
          "Use the API for the main merchant integration path.",
          "Use the SDK for typed backend helpers and infrastructure code.",
          "Keep SDK write access away from the frontend.",
        ],
      },
      {
        id: "guide-sdk-path",
        title: "Recommended adoption path",
        paragraphs: [
          "Start with checkout and workspace APIs first. Add the SDK later only if a backend workflow becomes repetitive enough to benefit from typed clients.",
        ],
        references: [
          {
            label: "SDK",
            value: "SDK Reference",
            detail: "Use the SDK Reference tab for client, helper, and type details.",
          },
        ],
      },
    ],
  },
  {
    id: "guide-go-live",
    category: "guides",
    group: "Reference",
    navTitle: "Go live",
    title: "Go live & troubleshooting",
    description:
      "Checklist, common errors, and the fastest way to debug a stalled billing flow.",
    sections: [
      {
        id: "guide-go-live-errors",
        title: "Common errors you will see",
        paragraphs: [
          "Most early integration errors come from using the wrong credential type, the wrong environment, or an expired checkout session.",
        ],
        bullets: [
          "`401 Missing Renew server key.`: checkout server request sent without a server key.",
          "`401 Invalid Renew server key.`: the key was revoked or does not exist.",
          "`401 Missing Renew checkout client secret.`: customer session request was made without the client secret.",
          "`410 Checkout session has expired.`: create a new checkout session and restart the customer flow.",
          "`409 Plan is not active.`: the chosen plan cannot be used for checkout.",
          "`409 Selected market is not enabled for this plan.`: choose a market supported by that plan or update the plan configuration.",
        ],
      },
      {
        id: "guide-go-live-checklist",
        title: "Go-live checklist",
        paragraphs: [
          "Before live traffic, make sure sandbox mode works cleanly from plan listing through webhook delivery. Then issue live server keys, create production webhook endpoints, and confirm your backend never mixes sandbox and live credentials.",
        ],
        bullets: [
          "Verify active plans exist in the target environment.",
          "Issue a live server key for production checkout calls.",
          "Register and test your live webhook endpoint.",
          "Confirm your backend stores checkout client secrets only for the active customer flow.",
          "Check charge and delivery logs during your first live transactions.",
        ],
      },
      {
        id: "guide-go-live-debug",
        title: "Troubleshooting path",
        paragraphs: [
          "When a billing flow stalls, work from the outside in: inspect the checkout session first, then the subscription, then the related charge, then webhook deliveries if your downstream system looks out of sync.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/sessions/:sessionId",
            detail: "Read current customer checkout state and next action.",
          },
          {
            label: "GET",
            value: "/v1/subscriptions/:subscriptionId",
            detail: "Inspect the current renewal snapshot for a subscriber.",
          },
          {
            label: "GET",
            value: "/v1/charges/:chargeId",
            detail: "Inspect one charge outcome in detail.",
          },
          {
            label: "GET",
            value: "/v1/developers/deliveries",
            detail: "Inspect whether webhook delivery succeeded.",
          },
        ],
      },
    ],
  },
  {
    id: "api-auth",
    category: "api",
    group: "Get started",
    navTitle: "Server keys & environments",
    title: "Authentication, keys, and runtime",
    description:
      "Public runtime endpoints, operator auth, server key management, and the credential formats used by checkout and workspace APIs.",
    sections: [
      {
        id: "api-auth-runtime",
        title: "Public runtime endpoints",
        paragraphs: [
          "Runtime and health endpoints are public and do not require authentication headers. Use them for monitoring and for reading network or contract metadata before your backend initializes clients.",
        ],
        references: [
          {
            label: "GET",
            value: "/health",
            detail: "Return service health.",
          },
          {
            label: "GET",
            value: "/v1/protocol",
            detail: "Return network, settlement asset, and active runtime config.",
          },
        ],
      },
      {
        id: "api-auth-operator",
        title: "Operator authentication",
        paragraphs: [
          "Workspace billing APIs use `Authorization: Bearer <jwt>`. Team members get that JWT by logging in or activating an invite, then use it from your admin, ops, or finance tools.",
        ],
        references: [
          {
            label: "POST",
            value: "/v1/auth/login",
            detail: "Create an operator session.",
          },
          {
            label: "POST",
            value: "/v1/auth/activate-invite",
            detail: "Activate an invite and set the initial password.",
          },
          {
            label: "GET",
            value: "/v1/auth/me",
            detail: "Resolve the current operator session.",
          },
        ],
      },
      {
        id: "api-auth-keys",
        title: "Server key management",
        paragraphs: [
          "Server keys are the credentials your backend uses for checkout requests. The raw token is returned only once when the key is created, so store it immediately.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/developers/keys",
            detail: "List server keys for a merchant workspace.",
          },
          {
            label: "POST",
            value: "/v1/developers/keys",
            detail: "Create a sandbox or live server key and receive the raw token once.",
          },
          {
            label: "POST",
            value: "/v1/developers/keys/:developerKeyId/revoke",
            detail: "Revoke a server key.",
          },
        ],
      },
    ],
  },
  {
    id: "api-checkout",
    category: "api",
    group: "Integration",
    navTitle: "Checkout",
    title: "Checkout API",
    description:
      "Server-key and client-secret endpoints for plan listing, checkout session creation, customer submission, and sandbox completion.",
    sections: [
      {
        id: "api-checkout-server",
        title: "Server-key endpoints",
        paragraphs: [
          "Call these endpoints from your backend with `x-renew-secret-key` or a bearer token starting with `rw_`. They start every customer checkout flow.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/plans",
            detail: "List active plans for the current server key.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions",
            detail: "Create a checkout session with `planId`, optional `expiresInMinutes`, and optional metadata.",
          },
        ],
      },
      {
        id: "api-checkout-session",
        title: "Client-secret endpoints",
        paragraphs: [
          "Call these endpoints with `x-renew-client-secret` or a bearer token starting with `rcs_`. They power the customer-facing flow after your backend creates the session.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/checkout/sessions/:sessionId",
            detail: "Read the current checkout session.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/customer",
            detail: "Submit customer details and payment routing.",
          },
          {
            label: "POST",
            value: "/v1/checkout/sessions/:sessionId/test-complete",
            detail: "Complete a pending payment in sandbox mode.",
          },
        ],
      },
      {
        id: "api-checkout-example",
        title: "Checkout API example",
        paragraphs: [
          "These request shapes show the two auth modes involved in checkout: server key first, then client secret.",
        ],
        samples: [
          createJsonSample("List plans with server key", "checkout-plans.request.json", {
            method: "GET",
            path: "/v1/checkout/plans",
            headers: {
              Authorization: "Bearer rw_test_xxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
          createJsonSample("Read session with client secret", "checkout-session.request.json", {
            method: "GET",
            path: "/v1/checkout/sessions/64f8d430f1d2c11d0e63ba13",
            headers: {
              Authorization:
                "Bearer rcs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            },
          }),
        ],
      },
    ],
  },
  {
    id: "api-customers",
    category: "api",
    group: "Billing",
    navTitle: "Customers",
    title: "Customers API",
    description:
      "Workspace billing endpoints for listing, creating, updating, pausing, resuming, and blacklisting customers.",
    sections: [
      {
        id: "api-customers-reference",
        title: "Customer endpoints",
        paragraphs: [
          "Use these endpoints from a signed-in workspace tool with a bearer JWT. They are for team operations, not for customer-facing checkout.",
          "List requests can filter by `merchantId`, `status`, `market`, and `search`. Create and action requests typically include `merchantId` and an optional `actor` for audit history.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/customers",
            detail: "List customers.",
          },
          {
            label: "POST",
            value: "/v1/customers",
            detail: "Create a customer.",
          },
          {
            label: "GET",
            value: "/v1/customers/:customerId",
            detail: "Fetch one customer.",
          },
          {
            label: "PATCH",
            value: "/v1/customers/:customerId",
            detail: "Update customer fields.",
          },
          {
            label: "POST",
            value: "/v1/customers/:customerId/pause",
            detail: "Pause a customer.",
          },
          {
            label: "POST",
            value: "/v1/customers/:customerId/resume",
            detail: "Resume a customer.",
          },
          {
            label: "POST",
            value: "/v1/customers/:customerId/blacklist",
            detail: "Blacklist a customer.",
          },
        ],
      },
    ],
  },
  {
    id: "api-plans",
    category: "api",
    group: "Billing",
    navTitle: "Plans",
    title: "Plans API",
    description:
      "Workspace billing endpoints for plan catalog management.",
    sections: [
      {
        id: "api-plans-reference",
        title: "Plan endpoints",
        paragraphs: [
          "Plans are managed through the workspace API and are later consumed by checkout and subscription creation flows.",
          "Plan creation requires pricing, interval, billing mode, supported markets, and a status of `draft`, `active`, or `archived`.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/plans",
            detail: "List plans.",
          },
          {
            label: "POST",
            value: "/v1/plans",
            detail: "Create a plan.",
          },
          {
            label: "GET",
            value: "/v1/plans/:planId",
            detail: "Fetch one plan.",
          },
          {
            label: "PATCH",
            value: "/v1/plans/:planId",
            detail: "Update a plan.",
          },
        ],
      },
    ],
  },
  {
    id: "api-subscriptions",
    category: "api",
    group: "Billing",
    navTitle: "Subscriptions",
    title: "Subscriptions API",
    description:
      "Workspace billing endpoints for direct subscription creation and subscription lifecycle updates.",
    sections: [
      {
        id: "api-subscriptions-reference",
        title: "Subscription endpoints",
        paragraphs: [
          "Subscription endpoints manage the customer-specific billing snapshot used for future charges.",
          "Creating a subscription requires the customer snapshot, billing currency, amount, payment routing fields, and `nextChargeAt`.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/subscriptions",
            detail: "List subscriptions.",
          },
          {
            label: "POST",
            value: "/v1/subscriptions",
            detail: "Create a subscription.",
          },
          {
            label: "GET",
            value: "/v1/subscriptions/:subscriptionId",
            detail: "Fetch one subscription.",
          },
          {
            label: "PATCH",
            value: "/v1/subscriptions/:subscriptionId",
            detail: "Update subscription status, timing, or payment routing.",
          },
          {
            label: "POST",
            value: "/v1/subscriptions/:subscriptionId/queue-charge",
            detail: "Queue the next renewal charge.",
          },
        ],
      },
    ],
  },
  {
    id: "api-renewals",
    category: "api",
    group: "Billing",
    navTitle: "Renewals & charges",
    title: "Renewals and charges API",
    description:
      "Charge endpoints for direct charge creation, inspection, updates, and retries.",
    sections: [
      {
        id: "api-renewals-reference",
        title: "Charge endpoints",
        paragraphs: [
          "Charge endpoints are the main operational surface for charge outcomes once a subscription has attempted billing.",
          "Direct charge creation and retry are protected in live mode by merchant KYB checks, so use the subscription queue endpoint when you want Renew to drive the renewal from an existing subscription.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/charges",
            detail: "List charges.",
          },
          {
            label: "POST",
            value: "/v1/charges",
            detail: "Create a charge record.",
          },
          {
            label: "GET",
            value: "/v1/charges/:chargeId",
            detail: "Fetch one charge.",
          },
          {
            label: "PATCH",
            value: "/v1/charges/:chargeId",
            detail: "Update a charge.",
          },
          {
            label: "POST",
            value: "/v1/charges/:chargeId/retry",
            detail: "Retry a failed charge.",
          },
        ],
      },
    ],
  },
  {
    id: "api-webhooks",
    category: "api",
    group: "Integration",
    navTitle: "Webhooks",
    title: "Webhooks API",
    description:
      "Webhook registration, rotation, test-delivery, and delivery-log endpoints.",
    sections: [
      {
        id: "api-webhooks-reference",
        title: "Webhook endpoints",
        paragraphs: [
          "Use these bearer-authenticated workspace endpoints to manage the outbound event flow into your systems.",
          "Webhook creation requires `merchantId`, `label`, `endpointUrl`, at least one event type, and an optional retry policy.",
        ],
        references: [
          {
            label: "GET",
            value: "/v1/developers/webhooks",
            detail: "List webhooks.",
          },
          {
            label: "POST",
            value: "/v1/developers/webhooks",
            detail: "Create a webhook.",
          },
          {
            label: "PATCH",
            value: "/v1/developers/webhooks/:webhookId",
            detail: "Update a webhook.",
          },
          {
            label: "POST",
            value: "/v1/developers/webhooks/:webhookId/rotate-secret",
            detail: "Rotate the webhook secret.",
          },
          {
            label: "POST",
            value: "/v1/developers/webhooks/:webhookId/test",
            detail: "Send a test delivery.",
          },
          {
            label: "GET",
            value: "/v1/developers/deliveries",
            detail: "List delivery attempts.",
          },
        ],
      },
    ],
  },
  {
    id: "sdk-overview",
    category: "sdk",
    group: "Optional SDK",
    navTitle: "Overview",
    title: "Optional server-side SDK",
    description:
      "Typed helpers for backends that need runtime config, billing clients, balance helpers, and shared event utilities.",
    sections: [
      {
        id: "sdk-overview-need",
        title: "When to use the SDK",
        paragraphs: [
          "Most merchants do not need the SDK to launch billing. The platform API already covers checkout, customers, plans, subscriptions, charges, server keys, and webhook management.",
          "Use the SDK only when you need typed backend helpers around runtime configuration, billing clients, balances, or shared event and record types.",
        ],
        bullets: [
          "Do use it for server-side infrastructure and reconciliation jobs.",
          "Do not use it as a replacement for normal checkout or workspace API integration.",
          "Keep SDK write access off the frontend.",
        ],
      },
      {
        id: "sdk-overview-transport",
        title: "Transport shape",
        paragraphs: [
          "The SDK expects a minimal transport with `read` and `write` methods so you can plug in your preferred EVM client.",
        ],
        references: [
          {
            label: "type",
            value: "ContractTransport",
            detail: "Minimal read/write interface expected by the SDK.",
          },
          {
            label: "type",
            value: "RenewProtocolConfig",
            detail: "Runtime config type returned by `/v1/protocol`.",
          },
        ],
      },
      {
        id: "sdk-overview-example",
        title: "SDK bootstrap example",
        paragraphs: [
          "A common pattern is to read runtime config from the public protocol endpoint and then create the SDK clients from those addresses.",
        ],
        sample: {
          label: "Initialize SDK clients",
          language: "ts",
          filename: "renew-sdk.ts",
          code: `import {
  createRenewProtocolClient,
  createRenewVaultClient,
  type ContractTransport,
  type RenewProtocolConfig,
} from "@renew/sdk";

async function getRuntimeConfig(): Promise<RenewProtocolConfig> {
  const response = await fetch(\`\${process.env.RENEW_API_BASE_URL}/v1/protocol\`);
  const payload = await response.json();
  return payload.data.config;
}

const transport: ContractTransport = {
  read: (request) => walletClient.readContract(request),
  write: (request) => walletClient.writeContract(request),
};

const config = await getRuntimeConfig();

const protocol = createRenewProtocolClient(transport, config.protocolAddress);
const vault = createRenewVaultClient(transport, config.vaultAddress);`,
        },
      },
    ],
  },
  {
    id: "sdk-clients",
    category: "sdk",
    group: "Optional SDK",
    navTitle: "Clients, events, and types",
    title: "SDK clients, events, and shared types",
    description:
      "What the SDK exports for billing clients, balances, event helpers, and shared record types.",
    sections: [
      {
        id: "sdk-clients-billing",
        title: "Billing client",
        paragraphs: [
          "The billing client provides typed helpers for merchant registration, plan creation, subscription creation, charge execution, failed charge recording, and subscription status updates.",
        ],
        references: [
          {
            label: "client",
            value: "createRenewProtocolClient(transport, address)",
            detail: "Create the billing client.",
          },
          {
            label: "method",
            value: "createPlan(input) | createSubscription(input)",
            detail: "Create billing objects through the SDK.",
          },
          {
            label: "method",
            value: "executeCharge(input) | recordFailedCharge(input)",
            detail: "Record successful or failed charge outcomes.",
          },
        ],
      },
      {
        id: "sdk-clients-vault",
        title: "Balance and event helpers",
        paragraphs: [
          "The SDK also exports a vault client, event-name helpers, and shared record types for backend reconciliation or reporting code.",
        ],
        references: [
          {
            label: "client",
            value: "createRenewVaultClient(transport, address)",
            detail: "Create the vault client.",
          },
          {
            label: "helper",
            value: "renewEventNames | isRenewEventName(value)",
            detail: "Event helper exports.",
          },
          {
            label: "type",
            value: "MerchantRecord | PlanRecord | SubscriptionRecord | ChargeRecord | SettlementRecord",
            detail: "Shared record types used across backend integrations.",
          },
        ],
      },
      {
        id: "sdk-clients-example",
        title: "Helper example",
        paragraphs: [
          "This example reads balances and validates an incoming event name before processing it.",
        ],
        sample: {
          label: "Read balances and validate events",
          language: "ts",
          filename: "sdk-helpers.ts",
          code: `import {
  createRenewVaultClient,
  isRenewEventName,
  renewEventNames,
} from "@renew/sdk";

const vault = createRenewVaultClient(transport, config.vaultAddress);

const merchantBalance = await vault.getMerchantBalance(
  "0x1111111111111111111111111111111111111111",
);
const protocolFees = await vault.getProtocolFeeBalance();

function handleEvent(eventName: string) {
  if (!isRenewEventName(eventName)) {
    return;
  }

  if (!renewEventNames.includes(eventName)) {
    return;
  }

  console.log({ eventName, merchantBalance, protocolFees });
}`,
        },
      },
    ],
  },
];

export function isDocsCategoryId(
  value: string | null | undefined,
): value is DocsCategoryId {
  return docsCategories.some((category) => category.id === value);
}

export function getDocsPages(category: DocsCategoryId) {
  const orderedIds = docsPageOrder[category];
  const position = new Map(orderedIds.map((pageId, index) => [pageId, index]));

  return docsPages
    .filter((page) => page.category === category)
    .sort((pageA, pageB) => {
      const indexA = position.get(pageA.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = position.get(pageB.id) ?? Number.MAX_SAFE_INTEGER;

      return indexA - indexB;
    });
}

export function getDocsPage(pageId: string | null | undefined) {
  return docsPages.find((page) => page.id === pageId) ?? null;
}

export function getDocsCategoryForPage(pageId: string | null | undefined) {
  return getDocsPage(pageId)?.category ?? null;
}
