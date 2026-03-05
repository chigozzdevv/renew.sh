import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const settingSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    supportEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    defaultMarket: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "NGN",
    },
    invoicePrefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "RNL",
    },
    billingTimezone: {
      type: String,
      required: true,
      trim: true,
      default: "UTC",
    },
    billingDisplay: {
      type: String,
      required: true,
      trim: true,
      default: "local-fiat",
    },
    fallbackCurrency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USDC",
    },
    statementDescriptor: {
      type: String,
      required: true,
      trim: true,
      default: "RENEW",
    },
    brandAccent: {
      type: String,
      required: true,
      trim: true,
      default: "forest-green",
    },
    customerDomain: {
      type: String,
      required: true,
      trim: true,
      default: "pay.renew.sh",
    },
    invoiceFooter: {
      type: String,
      required: true,
      trim: true,
      default: "Thanks for billing with Renew.",
    },
    retryPolicy: {
      type: String,
      required: true,
      trim: true,
      default: "Smart retries",
    },
    invoiceGraceDays: {
      type: Number,
      required: true,
      min: 0,
      default: 2,
    },
    autoRetries: {
      type: Boolean,
      required: true,
      default: true,
    },
    meterApproval: {
      type: Boolean,
      required: true,
      default: true,
    },
    primaryWallet: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    reserveWallet: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    walletAlerts: {
      type: Boolean,
      required: true,
      default: true,
    },
    financeDigest: {
      type: Boolean,
      required: true,
      default: true,
    },
    developerAlerts: {
      type: Boolean,
      required: true,
      default: true,
    },
    loginAlerts: {
      type: Boolean,
      required: true,
      default: true,
    },
    sessionTimeout: {
      type: String,
      required: true,
      trim: true,
      default: "30 minutes",
    },
    inviteDomainPolicy: {
      type: String,
      required: true,
      trim: true,
      default: "Allow all domains",
    },
    enforceTwoFactor: {
      type: Boolean,
      required: true,
      default: false,
    },
    restrictInviteDomains: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

type SettingEntry = InferSchemaType<typeof settingSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SettingDocument = SettingEntry;

export const SettingModel =
  (models.Setting as Model<SettingDocument> | undefined) ??
  model<SettingDocument>("Setting", settingSchema);
