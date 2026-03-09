import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const merchantSchema = new Schema(
  {
    merchantAccount: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    payoutWallet: {
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
    name: {
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
    billingTimezone: {
      type: String,
      required: true,
      trim: true,
      default: "UTC",
    },
    supportedMarkets: {
      type: [String],
      required: true,
      default: [],
    },
    metadataHash: {
      type: String,
      trim: true,
      default: "0x0",
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

type MerchantEntry = InferSchemaType<typeof merchantSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type MerchantDocument = MerchantEntry;

export const MerchantModel =
  (models.Merchant as Model<MerchantDocument> | undefined) ??
  model<MerchantDocument>("Merchant", merchantSchema);
