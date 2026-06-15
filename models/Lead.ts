import mongoose, { Schema, type Model } from "mongoose";

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    callStatus: {
      type: String,
      enum: ["pending", "picked", "npc"],
      default: "pending",
    },
    interestStatus: {
      type: String,
      enum: ["pending", "interested", "not_interested"],
      default: "pending",
    },
    lastCalledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leadSchema.index({ phone: 1 }, { unique: true });
leadSchema.index({ createdAt: -1 });

export type LeadMongo = mongoose.InferSchemaType<typeof leadSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const LeadModel: Model<LeadMongo> =
  (mongoose.models.Lead as Model<LeadMongo>) ||
  mongoose.model<LeadMongo>("Lead", leadSchema);
