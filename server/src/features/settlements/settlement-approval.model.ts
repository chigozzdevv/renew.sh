import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const settlementApproverSchema = new Schema(
  {
    teamMemberId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    approvedAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const settlementApprovalSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "Settlement",
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "pending",
    },
    threshold: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    requestedBy: {
      type: String,
      required: true,
      trim: true,
    },
    approvals: {
      type: [settlementApproverSchema],
      required: true,
      default: [],
    },
    rejectedBy: {
      type: String,
      trim: true,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    lastActionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

settlementApprovalSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

type SettlementApprovalEntry = InferSchemaType<typeof settlementApprovalSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type SettlementApprovalDocument = SettlementApprovalEntry;

export const SettlementApprovalModel =
  (models.SettlementApproval as Model<SettlementApprovalDocument> | undefined) ??
  model<SettlementApprovalDocument>("SettlementApproval", settlementApprovalSchema);
