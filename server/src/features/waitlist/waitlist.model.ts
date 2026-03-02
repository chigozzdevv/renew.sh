import { InferSchemaType, Model, Schema, Types, model, models } from "mongoose";

const waitlistSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    company: {
      type: String,
      trim: true,
      default: null,
    },
    useCase: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      default: "landing-page",
    },
    status: {
      type: String,
      required: true,
      trim: true,
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

type WaitlistEntry = InferSchemaType<typeof waitlistSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type WaitlistDocument = WaitlistEntry;

export const WaitlistModel =
  (models.Waitlist as Model<WaitlistDocument> | undefined) ??
  model<WaitlistDocument>("Waitlist", waitlistSchema);
