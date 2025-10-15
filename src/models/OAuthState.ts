import mongoose, { Document, Schema } from "mongoose";

export interface IOAuthState extends Document {
  key: string;
  data: any;
  expiresAt: Date;
  createdAt: Date;
}

const oAuthStateSchema = new Schema<IOAuthState>({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
oAuthStateSchema.index({ key: 1, expiresAt: 1 });

export const OAuthState = mongoose.model<IOAuthState>(
  "OAuthState",
  oAuthStateSchema
);
