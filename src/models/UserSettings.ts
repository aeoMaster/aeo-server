import mongoose, { Document, Schema } from "mongoose";

export interface IUserSettings extends Document {
  user: mongoose.Types.ObjectId;
  notifications: boolean;
  darkMode: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  notifications: {
    type: Boolean,
    default: true,
  },
  darkMode: {
    type: Boolean,
    default: false,
  },
  language: {
    type: String,
    default: "en",
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

// Update the updatedAt timestamp before saving
userSettingsSchema.pre("save", function (this: any, next) {
  this.updatedAt = new Date();
  next();
});

export const UserSettings = mongoose.model<IUserSettings>(
  "UserSettings",
  userSettingsSchema
);
