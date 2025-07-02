import mongoose, { Document, Schema } from "mongoose";

export interface IPlatformToken extends Document {
  user: mongoose.Types.ObjectId;
  platform: "linkedin" | "twitter" | "facebook";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  platformUserId?: string;
  platformUsername?: string;
  isActive: boolean;
  needsReauth?: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const platformTokenSchema = new Schema<IPlatformToken>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  platform: {
    type: String,
    enum: ["linkedin", "twitter", "facebook"],
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
  platformUserId: {
    type: String,
  },
  platformUsername: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  needsReauth: {
    type: Boolean,
    default: false,
  },
  lastUsed: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamps
platformTokenSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Ensure one active token per user per platform
platformTokenSchema.index(
  { user: 1, platform: 1, isActive: 1 },
  { unique: true }
);

// Index for token expiration queries
platformTokenSchema.index({ expiresAt: 1 });

export const PlatformToken = mongoose.model<IPlatformToken>(
  "PlatformToken",
  platformTokenSchema
);
