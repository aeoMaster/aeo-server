import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  _id: string; // Session ID
  session: any; // Session data
  expires: Date; // Expiration date
}

const sessionSchema = new Schema<ISession>({
  _id: {
    type: String,
    required: true,
  },
  session: {
    type: Schema.Types.Mixed,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
  },
});

// Compound index for efficient queries
sessionSchema.index({ _id: 1, expires: 1 });

export const Session = mongoose.model<ISession>("Session", sessionSchema);
