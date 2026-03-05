import { HttpError } from "@/shared/errors/http-error";

import { appendAuditLog } from "@/features/audit/audit.service";
import { CustomerModel } from "@/features/customers/customer.model";
import { MerchantModel } from "@/features/merchants/merchant.model";
import type {
  BlacklistCustomerInput,
  CreateCustomerInput,
  CustomerActionInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "@/features/customers/customer.validation";

function toCustomerResponse(document: {
  _id: { toString(): string };
  merchantId: { toString(): string };
  customerRef: string;
  name: string;
  email: string;
  market: string;
  status: string;
  billingState: string;
  paymentMethodState: string;
  subscriptionCount: number;
  monthlyVolumeUsdc: number;
  nextRenewalAt?: Date | null;
  lastChargeAt?: Date | null;
  autoReminderEnabled: boolean;
  blacklistedAt?: Date | null;
  blacklistReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document._id.toString(),
    merchantId: document.merchantId.toString(),
    customerRef: document.customerRef,
    name: document.name,
    email: document.email,
    market: document.market,
    status: document.status,
    billingState: document.billingState,
    paymentMethodState: document.paymentMethodState,
    subscriptionCount: document.subscriptionCount,
    monthlyVolumeUsdc: document.monthlyVolumeUsdc,
    nextRenewalAt: document.nextRenewalAt ?? null,
    lastChargeAt: document.lastChargeAt ?? null,
    autoReminderEnabled: document.autoReminderEnabled,
    blacklistedAt: document.blacklistedAt ?? null,
    blacklistReason: document.blacklistReason ?? null,
    metadata: document.metadata ?? {},
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function ensureMerchant(merchantId: string) {
  const merchant = await MerchantModel.findById(merchantId).exec();

  if (!merchant) {
    throw new HttpError(404, "Merchant was not found.");
  }
}

async function ensureCustomer(customerId: string, merchantId: string) {
  const customer = await CustomerModel.findOne({
    _id: customerId,
    merchantId,
  }).exec();

  if (!customer) {
    throw new HttpError(404, "Customer was not found.");
  }

  return customer;
}

export async function listCustomers(query: ListCustomersQuery) {
  await ensureMerchant(query.merchantId);

  const mongoQuery: Record<string, unknown> = {
    merchantId: query.merchantId,
  };

  if (query.status) {
    mongoQuery.status = query.status;
  }

  if (query.market) {
    mongoQuery.market = query.market;
  }

  if (query.search) {
    const pattern = new RegExp(query.search, "i");
    mongoQuery.$or = [
      { name: pattern },
      { email: pattern },
      { customerRef: pattern },
    ];
  }

  const customers = await CustomerModel.find(mongoQuery)
    .sort({ updatedAt: -1 })
    .exec();

  return customers.map(toCustomerResponse);
}

export async function getCustomerById(customerId: string, merchantId: string) {
  await ensureMerchant(merchantId);
  const customer = await ensureCustomer(customerId, merchantId);

  return toCustomerResponse(customer);
}

export async function createCustomer(input: CreateCustomerInput) {
  await ensureMerchant(input.merchantId);

  const existing = await CustomerModel.findOne({
    merchantId: input.merchantId,
    $or: [{ customerRef: input.customerRef }, { email: input.email }],
  }).exec();

  if (existing) {
    throw new HttpError(409, "Customer with this ref or email already exists.");
  }

  const created = await CustomerModel.create({
    merchantId: input.merchantId,
    customerRef: input.customerRef,
    name: input.name,
    email: input.email,
    market: input.market,
    status: input.status,
    billingState: input.billingState,
    paymentMethodState: input.paymentMethodState,
    subscriptionCount: input.subscriptionCount,
    monthlyVolumeUsdc: input.monthlyVolumeUsdc,
    nextRenewalAt: input.nextRenewalAt,
    lastChargeAt: input.lastChargeAt,
    autoReminderEnabled: input.autoReminderEnabled,
    metadata: input.metadata,
    blacklistedAt: input.status === "blacklisted" ? new Date() : null,
    blacklistReason: null,
  });

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Created customer",
    category: "billing",
    status: "ok",
    target: input.email,
    detail: `${input.name} was added to customer directory.`,
    metadata: {
      customerRef: input.customerRef,
      market: input.market,
      status: input.status,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toCustomerResponse(created);
}

export async function updateCustomer(
  customerId: string,
  merchantId: string,
  input: UpdateCustomerInput
) {
  await ensureMerchant(merchantId);
  const customer = await ensureCustomer(customerId, merchantId);

  if (input.name !== undefined) {
    customer.name = input.name;
  }

  if (input.email !== undefined) {
    customer.email = input.email;
  }

  if (input.market !== undefined) {
    customer.market = input.market;
  }

  if (input.status !== undefined) {
    customer.status = input.status;

    if (input.status !== "blacklisted") {
      customer.blacklistedAt = null;
      customer.blacklistReason = null;
    }
  }

  if (input.billingState !== undefined) {
    customer.billingState = input.billingState;
  }

  if (input.paymentMethodState !== undefined) {
    customer.paymentMethodState = input.paymentMethodState;
  }

  if (input.subscriptionCount !== undefined) {
    customer.subscriptionCount = input.subscriptionCount;
  }

  if (input.monthlyVolumeUsdc !== undefined) {
    customer.monthlyVolumeUsdc = input.monthlyVolumeUsdc;
  }

  if (input.nextRenewalAt !== undefined) {
    customer.nextRenewalAt = input.nextRenewalAt;
  }

  if (input.lastChargeAt !== undefined) {
    customer.lastChargeAt = input.lastChargeAt;
  }

  if (input.autoReminderEnabled !== undefined) {
    customer.autoReminderEnabled = input.autoReminderEnabled;
  }

  if (input.metadata !== undefined) {
    customer.metadata = {
      ...(customer.metadata ?? {}),
      ...input.metadata,
    };
  }

  await customer.save();

  await appendAuditLog({
    merchantId,
    actor: input.actor,
    action: "Updated customer",
    category: "billing",
    status: "ok",
    target: customer.email,
    detail: `Updated profile for ${customer.name}.`,
    metadata: {
      status: customer.status,
      billingState: customer.billingState,
      paymentMethodState: customer.paymentMethodState,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toCustomerResponse(customer);
}

export async function pauseCustomerBilling(
  customerId: string,
  input: CustomerActionInput
) {
  await ensureMerchant(input.merchantId);
  const customer = await ensureCustomer(customerId, input.merchantId);

  customer.status = "paused";
  customer.billingState = "paused";
  await customer.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Paused customer billing",
    category: "billing",
    status: "warning",
    target: customer.email,
    detail: `Billing paused for ${customer.name}.`,
    metadata: {},
    ipAddress: null,
    userAgent: null,
  });

  return toCustomerResponse(customer);
}

export async function resumeCustomerBilling(
  customerId: string,
  input: CustomerActionInput
) {
  await ensureMerchant(input.merchantId);
  const customer = await ensureCustomer(customerId, input.merchantId);

  if (customer.status === "blacklisted") {
    throw new HttpError(409, "Blacklisted customer cannot be resumed.");
  }

  customer.status = "active";
  customer.billingState = customer.paymentMethodState === "ok" ? "healthy" : "at_risk";
  await customer.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Resumed customer billing",
    category: "billing",
    status: "ok",
    target: customer.email,
    detail: `Billing resumed for ${customer.name}.`,
    metadata: {},
    ipAddress: null,
    userAgent: null,
  });

  return toCustomerResponse(customer);
}

export async function blacklistCustomer(
  customerId: string,
  input: BlacklistCustomerInput
) {
  await ensureMerchant(input.merchantId);
  const customer = await ensureCustomer(customerId, input.merchantId);

  customer.status = "blacklisted";
  customer.billingState = "paused";
  customer.blacklistedAt = new Date();
  customer.blacklistReason = input.reason;
  customer.autoReminderEnabled = false;
  await customer.save();

  await appendAuditLog({
    merchantId: input.merchantId,
    actor: input.actor,
    action: "Blacklisted customer",
    category: "security",
    status: "warning",
    target: customer.email,
    detail: `${customer.name} was blacklisted.`,
    metadata: {
      reason: input.reason,
    },
    ipAddress: null,
    userAgent: null,
  });

  return toCustomerResponse(customer);
}
