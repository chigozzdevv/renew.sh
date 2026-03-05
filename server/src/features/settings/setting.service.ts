import { HttpError } from "@/shared/errors/http-error";

import { appendAuditLog } from "@/features/audit/audit.service";
import { MerchantModel } from "@/features/merchants/merchant.model";
import { SettingModel } from "@/features/settings/setting.model";
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
  createdAt: Date;
  updatedAt: Date;
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
      primaryWallet: document.primaryWallet,
      reserveWallet: document.reserveWallet ?? null,
      walletAlerts: document.walletAlerts,
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
    });
  }

  return { merchant, setting };
}

export async function getSettingsByMerchantId(merchantId: string) {
  const { setting } = await getOrCreateSetting(merchantId);

  return toSettingResponse(setting);
}

export async function updateSettingsByMerchantId(
  merchantId: string,
  input: UpdateSettingsInput
) {
  const { merchant, setting } = await getOrCreateSetting(merchantId);

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
    if (input.wallets.primaryWallet !== undefined) {
      setting.primaryWallet = input.wallets.primaryWallet.toLowerCase();
      merchant.payoutWallet = input.wallets.primaryWallet.toLowerCase();
    }

    if (input.wallets.reserveWallet !== undefined) {
      setting.reserveWallet = input.wallets.reserveWallet?.toLowerCase() ?? null;
      merchant.reserveWallet = input.wallets.reserveWallet?.toLowerCase() ?? null;
    }

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

  return toSettingResponse(setting);
}

export async function saveWalletSettings(
  merchantId: string,
  input: SaveWalletInput
) {
  const { merchant, setting } = await getOrCreateSetting(merchantId);

  setting.primaryWallet = input.primaryWallet.toLowerCase();
  setting.reserveWallet = input.reserveWallet?.toLowerCase() ?? null;

  if (input.walletAlerts !== undefined) {
    setting.walletAlerts = input.walletAlerts;
  }

  merchant.payoutWallet = setting.primaryWallet;
  merchant.reserveWallet = setting.reserveWallet;

  await Promise.all([setting.save(), merchant.save()]);

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Updated wallet settings",
    category: "security",
    status: "ok",
    target: merchant.supportEmail,
    detail: "Primary or reserve wallet was updated.",
    metadata: {
      primaryWallet: setting.primaryWallet,
      reserveWallet: setting.reserveWallet,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSettingResponse(setting);
}

export async function promoteReserveWallet(
  merchantId: string,
  input: WalletActionInput
) {
  const { merchant, setting } = await getOrCreateSetting(merchantId);

  if (!setting.reserveWallet) {
    throw new HttpError(409, "Reserve wallet is not configured.");
  }

  // Swap wallets so finance can promote a standby address in one action.
  const oldPrimaryWallet = setting.primaryWallet;
  setting.primaryWallet = setting.reserveWallet;
  setting.reserveWallet = oldPrimaryWallet;

  merchant.payoutWallet = setting.primaryWallet;
  merchant.reserveWallet = setting.reserveWallet;

  await Promise.all([setting.save(), merchant.save()]);

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Promoted reserve wallet",
    category: "security",
    status: "warning",
    target: merchant.supportEmail,
    detail: "Reserve wallet promoted to primary.",
    metadata: {
      primaryWallet: setting.primaryWallet,
      reserveWallet: setting.reserveWallet,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSettingResponse(setting);
}

export async function removeReserveWallet(
  merchantId: string,
  input: WalletActionInput
) {
  const { merchant, setting } = await getOrCreateSetting(merchantId);

  if (!setting.reserveWallet) {
    throw new HttpError(409, "Reserve wallet is not configured.");
  }

  const removedWallet = setting.reserveWallet;
  setting.reserveWallet = null;
  merchant.reserveWallet = null;

  await Promise.all([setting.save(), merchant.save()]);

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Removed reserve wallet",
    category: "security",
    status: "warning",
    target: merchant.supportEmail,
    detail: "Reserve wallet removed from workspace settings.",
    metadata: {
      removedWallet,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toSettingResponse(setting);
}
