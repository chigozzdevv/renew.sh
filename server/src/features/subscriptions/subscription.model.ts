import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const subscriptionSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
    },
    planId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Plan",
    },
    customerRef: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    billingCurrency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    localAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentAccountType: {
      type: String,
      required: true,
      trim: true,
      default: "bank",
    },
    paymentAccountNumber: {
      type: String,
      trim: true,
      default: null,
    },
    paymentNetworkId: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "active",
    },
    nextChargeAt: {
      type: Date,
      required: true,
    },
    lastChargeAt: {
      type: Date,
      default: null,
    },
    retryAvailableAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

type SubscriptionEntry = InferSchemaType<typeof subscriptionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SubscriptionDocument = SubscriptionEntry;

export const SubscriptionModel =
  (models.Subscription as Model<SubscriptionDocument> | undefined) ??
  model<SubscriptionDocument>("Subscription", subscriptionSchema);
