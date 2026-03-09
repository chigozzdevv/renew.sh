import { HttpError } from "@/shared/errors/http-error";
import type { RuntimeMode } from "@/shared/constants/runtime-mode";

import { appendAuditLog } from "@/features/audit/audit.service";
import { assertMerchantKybApprovedForLive } from "@/features/kyc/kyc.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettingModel } from "@/features/settings/setting.model";
import {
  createPayoutWalletConfirmOperation,
  createReserveClearOperation,
  createReservePromoteOperation,
  createWalletUpdateOperations,
  getTreasuryByMerchantId,
} from "@/features/treasury/treasury.service";
import type {
  SaveWalletInput,
  UpdateSettingsInput,
  WalletActionInput,
} from "@/features/settings/setting.validation";

function toSettingResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  businessName: string;
  supportEmail: string;
  defaultMarket: string;
  invoicePrefix: string;
  billingTimezone: string;
  billingDisplay: string;
  fallbackCurrency: string;
  statementDescriptor: string;
  brandAccent: string;
  customerDomain: string;
  invoiceFooter: string;
  retryPolicy: string;
  invoiceGraceDays: number;
  autoRetries: boolean;
  meterApproval: boolean;
  primaryWallet: string;
  reserveWallet?: string | null;
  walletAlerts: boolean;
  financeDigest: boolean;
  developerAlerts: boolean;
  loginAlerts: boolean;
  sessionTimeout: string;
  inviteDomainPolicy: string;
  enforceTwoFactor: boolean;
  restrictInviteDomains: boolean;
  sweepApprovalThreshold: number;
  createdAt: Date;
  updatedAt: Date;
},
treasury?: {
  account: {
    safeAddress: string;
    payoutWallet: string;
    reserveWallet?: string | null;
    threshold: number;
    pendingPayoutWallet?: string | null;
    payoutWalletChangeReadyAt?: Date | null;
  } | null;
  operations: Array<{
    id: string;
    kind: string;
    status: string;
  }>;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    profile: {
      businessName: document.businessName,
      supportEmail: document.supportEmail,
      defaultMarket: document.defaultMarket,
      invoicePrefix: document.invoicePrefix,
      billingTimezone: document.billingTimezone,
      billingDisplay: document.billingDisplay,
      fallbackCurrency: document.fallbackCurrency,
      statementDescriptor: document.statementDescriptor,
      brandAccent: document.brandAccent,
      customerDomain: document.customerDomain,
      invoiceFooter: document.invoiceFooter,
    },
    billing: {
      retryPolicy: document.retryPolicy,
      invoiceGraceDays: document.invoiceGraceDays,
      autoRetries: document.autoRetries,
      meterApproval: document.meterApproval,
    },
    wallets: {
      primaryWallet: treasury?.account?.payoutWallet ?? document.primaryWallet,
      reserveWallet: treasury?.account?.reserveWallet ?? document.reserveWallet ?? null,
      walletAlerts: document.walletAlerts,
      safeAddress: treasury?.account?.safeAddress ?? null,
      pendingPayoutWallet: treasury?.account?.pendingPayoutWallet ?? null,
      payoutWalletChangeReadyAt:
        treasury?.account?.payoutWalletChangeReadyAt ?? null,
    },
    notifications: {
      financeDigest: document.financeDigest,
      developerAlerts: document.developerAlerts,
      loginAlerts: document.loginAlerts,
    },
    security: {
      sessionTimeout: document.sessionTimeout,
      inviteDomainPolicy: document.inviteDomainPolicy,
      enforceTwoFactor: document.enforceTwoFactor,
      restrictInviteDomains: document.restrictInviteDomains,
      sweepApprovalThreshold: document.sweepApprovalThreshold,
    },
    treasury: {
      threshold: treasury?.account?.threshold ?? 0,
      pendingOperations: treasury?.operations ?? [],
    },
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function getMerchantOrThrow(merchantId: string) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }

  return merchant;
}

async function getOrCreateSetting(merchantId: string) {
  const merchant = await getMerchantOrThrow(merchantId);
  let setting = await SettingModel.findOne({ merchantId }).exec();

  if (!setting) {
    setting = await SettingModel.create({
      merchantId: merchant._id,
      businessName: merchant.name,
      supportEmail: merchant.supportEmail,
      defaultMarket: merchant.supportedMarkets[0] ?? "NGN",
      invoicePrefix: "RNL",
      billingTimezone: merchant.billingTimezone,
      billingDisplay: "local-fiat",
      fallbackCurrency: "USDC",
      statementDescriptor: "RENEW",
      brandAccent: "forest-green",
      customerDomain: "pay.renew.sh",
      invoiceFooter: "Thanks for billing with Renew.",
      retryPolicy: "Smart retries",
      invoiceGraceDays: 2,
      autoRetries: true,
      meterApproval: true,
      primaryWallet: merchant.payoutWallet,
      reserveWallet: merchant.reserveWallet ?? null,
      walletAlerts: true,
      financeDigest: true,
      developerAlerts: true,
      loginAlerts: true,
      sessionTimeout: "30 minutes",
      inviteDomainPolicy: "Allow all domains",
      enforceTwoFactor: false,
      restrictInviteDomains: false,
      sweepApprovalThreshold: 1,
    });
  }

  return { merchant, setting };
}

export async function getSettingsByMerchantId(
  merchantId: string,
  environment: RuntimeMode = "test"
) {
  const { setting } = await getOrCreateSetting(merchantId);
  const treasury = await getTreasuryByMerchantId(merchantId, environment).catch(() => ({
    account: null,
    signers: [],
    operations: [],
  }));

  return toSettingResponse(setting, {
    account: treasury.account
      ? {
          safeAddress: treasury.account.safeAddress,
          payoutWallet: treasury.account.payoutWallet,
          reserveWallet: treasury.account.reserveWallet,
          threshold: treasury.account.threshold,
          pendingPayoutWallet: treasury.account.pendingPayoutWallet,
          payoutWalletChangeReadyAt: treasury.account.payoutWalletChangeReadyAt,
        }
      : null,
    operations: treasury.operations.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      status: entry.status,
    })),
  });
}

export async function updateSettingsByMerchantId(
  merchantId: string,
  input: UpdateSettingsInput
) {
  const { merchant, setting } = await getOrCreateSetting(merchantId);

  const mutatesWallets =
    input.wallets !== undefined &&
    (input.wallets.primaryWallet !== undefined ||
      input.wallets.reserveWallet !== undefined);

  if (mutatesWallets) {
    await assertMerchantKybApprovedForLive(
      merchantId,
      "changing treasury wallets",
      input.environment
    );
  }

  if (input.profile) {
    if (input.profile.businessName !== undefined) {
      setting.businessName = input.profile.businessName;
      merchant.name = input.profile.businessName;
    }

    if (input.profile.supportEmail !== undefined) {
      setting.supportEmail = input.profile.supportEmail;
      merchant.supportEmail = input.profile.supportEmail;
    }

    if (input.profile.defaultMarket !== undefined) {
      setting.defaultMarket = input.profile.defaultMarket;
    }

    if (input.profile.invoicePrefix !== undefined) {
      setting.invoicePrefix = input.profile.invoicePrefix;
    }

    if (input.profile.billingTimezone !== undefined) {
      setting.billingTimezone = input.profile.billingTimezone;
      merchant.billingTimezone = input.profile.billingTimezone;
    }

    if (input.profile.billingDisplay !== undefined) {
      setting.billingDisplay = input.profile.billingDisplay;
    }

    if (input.profile.fallbackCurrency !== undefined) {
      setting.fallbackCurrency = input.profile.fallbackCurrency;
    }

    if (input.profile.statementDescriptor !== undefined) {
      setting.statementDescriptor = input.profile.statementDescriptor;
    }

    if (input.profile.brandAccent !== undefined) {
      setting.brandAccent = input.profile.brandAccent;
    }

    if (input.profile.customerDomain !== undefined) {
      setting.customerDomain = input.profile.customerDomain;
    }

    if (input.profile.invoiceFooter !== undefined) {
      setting.invoiceFooter = input.profile.invoiceFooter;
    }
  }

  if (input.billing) {
    if (input.billing.retryPolicy !== undefined) {
      setting.retryPolicy = input.billing.retryPolicy;
    }

    if (input.billing.invoiceGraceDays !== undefined) {
      setting.invoiceGraceDays = input.billing.invoiceGraceDays;
    }

    if (input.billing.autoRetries !== undefined) {
      setting.autoRetries = input.billing.autoRetries;
    }

    if (input.billing.meterApproval !== undefined) {
      setting.meterApproval = input.billing.meterApproval;
    }
  }

  if (input.wallets) {
    if (input.wallets.walletAlerts !== undefined) {
      setting.walletAlerts = input.wallets.walletAlerts;
    }
  }

  if (input.notifications) {
    if (input.notifications.financeDigest !== undefined) {
      setting.financeDigest = input.notifications.financeDigest;
    }

    if (input.notifications.developerAlerts !== undefined) {
      setting.developerAlerts = input.notifications.developerAlerts;
    }

    if (input.notifications.loginAlerts !== undefined) {
      setting.loginAlerts = input.notifications.loginAlerts;
    }
  }

  if (input.security) {
    if (input.security.sessionTimeout !== undefined) {
      setting.sessionTimeout = input.security.sessionTimeout;
    }

    if (input.security.inviteDomainPolicy !== undefined) {
      setting.inviteDomainPolicy = input.security.inviteDomainPolicy;
    }

    if (input.security.enforceTwoFactor !== undefined) {
      setting.enforceTwoFactor = input.security.enforceTwoFactor;
    }

    if (input.security.restrictInviteDomains !== undefined) {
      setting.restrictInviteDomains = input.security.restrictInviteDomains;
    }

    if (input.security.sweepApprovalThreshold !== undefined) {
      setting.sweepApprovalThreshold = input.security.sweepApprovalThreshold;
    }
  }

  await Promise.all([setting.save(), merchant.save()]);

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Updated workspace settings",
    category: "workspace",
    status: "ok",
    target: merchant.supportEmail,
    detail: "Workspace settings were updated.",
    metadata: {
      profile: Boolean(input.profile),
      billing: Boolean(input.billing),
      wallets: Boolean(input.wallets),
      notifications: Boolean(input.notifications),
      security: Boolean(input.security),
    },
    ipAddress: null,
    userAgent: null,
  });

  return getSettingsByMerchantId(merchantId, input.environment);
}

export async function saveWalletSettings(
  merchantId: string,
  input: SaveWalletInput
) {
  await assertMerchantKybApprovedForLive(
    merchantId,
    "changing treasury wallets",
    input.environment
  );

  const { setting } = await getOrCreateSetting(merchantId);

  if (input.walletAlerts !== undefined) {
    setting.walletAlerts = input.walletAlerts;
  }
  await setting.save();

  const operations = await createWalletUpdateOperations({
    merchantId,
    actor: input.actor,
    environment: input.environment,
    primaryWallet: input.primaryWallet,
    reserveWallet: input.reserveWallet,
  });

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Updated wallet settings",
    category: "security",
    status: "ok",
    target: input.primaryWallet,
    detail: "Treasury wallet change request created.",
    metadata: {
      primaryWallet: input.primaryWallet.toLowerCase(),
      reserveWallet: input.reserveWallet?.toLowerCase() ?? null,
      operationIds: operations.map((entry) => entry.id),
    },
    ipAddress: null,
    userAgent: null,
  });

  const settings = await getSettingsByMerchantId(merchantId, input.environment);

  return {
    settings,
    operations,
  };
}

export async function promoteReserveWallet(
  merchantId: string,
  input: WalletActionInput
) {
  await assertMerchantKybApprovedForLive(
    merchantId,
    "promoting treasury reserve wallets",
    input.environment
  );

  const operation = await createReservePromoteOperation({
    merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Requested reserve wallet promotion",
    category: "security",
    status: "warning",
    target: operation.id,
    detail: "Reserve wallet promotion queued for treasury approvals.",
    metadata: {
      operationId: operation.id,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    settings: await getSettingsByMerchantId(merchantId, input.environment),
    operation,
  };
}

export async function removeReserveWallet(
  merchantId: string,
  input: WalletActionInput
) {
  await assertMerchantKybApprovedForLive(
    merchantId,
    "removing treasury reserve wallets",
    input.environment
  );

  const operation = await createReserveClearOperation({
    merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Requested reserve wallet removal",
    category: "security",
    status: "warning",
    target: operation.id,
    detail: "Reserve wallet removal queued for treasury approvals.",
    metadata: {
      operationId: operation.id,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    settings: await getSettingsByMerchantId(merchantId, input.environment),
    operation,
  };
}

export async function confirmPendingPrimaryWalletChange(
  merchantId: string,
  input: WalletActionInput
) {
  await assertMerchantKybApprovedForLive(
    merchantId,
    "confirming treasury payout wallet changes",
    input.environment
  );

  const operation = await createPayoutWalletConfirmOperation({
    merchantId,
    actor: input.actor,
    environment: input.environment,
  });

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Requested payout wallet confirmation",
    category: "security",
    status: "ok",
    target: operation.id,
    detail: "Pending payout wallet confirmation queued for treasury approvals.",
    metadata: {
      operationId: operation.id,
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    settings: await getSettingsByMerchantId(merchantId, input.environment),
    operation,
  };
}
