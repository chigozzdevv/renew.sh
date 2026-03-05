import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const developerWebhookSchema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Merchant",
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    endpointUrl: {
      type: String,
      required: true,
      trim: true,
    },
    secretHash: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "active",
    },
    eventTypes: {
      type: [String],
      required: true,
      default: [],
    },
    retryPolicy: {
      type: String,
      required: true,
      trim: true,
      default: "exponential",
    },
    lastDeliveryAt: {
      type: Date,
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

developerWebhookSchema.index({ merchantId: 1, status: 1 });

type DeveloperWebhookEntry = InferSchemaType<typeof developerWebhookSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type DeveloperWebhookDocument = DeveloperWebhookEntry;

export const DeveloperWebhookModel =
  (models.DeveloperWebhook as Model<DeveloperWebhookDocument> | undefined) ??
  model<DeveloperWebhookDocument>("DeveloperWebhook", developerWebhookSchema);
