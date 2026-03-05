import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const settlementSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
    },
    sourceChargeId: {
      type: Schema.Types.ObjectId,
      ref: "Charge",
      default: null,
    },
    batchRef: {
      type: String,
      required: true,
      trim: true,
    },
    grossUsdc: {
      type: Number,
      required: true,
      min: 0,
    },
    feeUsdc: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    netUsdc: {
      type: Number,
      required: true,
      min: 0,
    },
    destinationWallet: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "queued",
    },
    txHash: {
      type: String,
      trim: true,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversalReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

type SettlementEntry = InferSchemaType<typeof settlementSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SettlementDocument = SettlementEntry;

export const SettlementModel =
  (models.Settlement as Model<SettlementDocument> | undefined) ??
  model<SettlementDocument>("Settlement", settlementSchema);
