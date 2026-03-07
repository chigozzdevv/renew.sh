import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const treasuryAccountSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
      unique: true,
    },
    custodyModel: {
      type: String,
      required: true,
      trim: true,
      default: "safe",
    },
    safeAddress: {
      type: String,
      required: true,
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
    ownerAddresses: {
      type: [String],
      required: true,
      default: [],
    },
    threshold: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    chainId: {
      type: Number,
      required: true,
    },
    txServiceUrl: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    gasPolicy: {
      type: String,
      required: true,
      trim: true,
      default: "sponsored",
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "active",
    },
    pendingPayoutWallet: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    payoutWalletChangeReadyAt: {
      type: Date,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

treasuryAccountSchema.index({ safeAddress: 1 }, { unique: true });

type TreasuryAccountEntry = InferSchemaType<typeof treasuryAccountSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type TreasuryAccountDocument = TreasuryAccountEntry;

export const TreasuryAccountModel =
  (models.TreasuryAccount as Model<TreasuryAccountDocument> | undefined) ??
  model<TreasuryAccountDocument>("TreasuryAccount", treasuryAccountSchema);
