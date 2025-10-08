import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";
import { ICompany } from "./Company";

export interface IUsage extends Document {
  user?: IUser["_id"];
  company?: ICompany["_id"];
  type: "analysis" | "clarity_scan" | "chat_message" | "storage";
  count: number;
  period: {
    start: Date;
    end: Date;
  };
  limits: {
    total: number;
    used: number;
    remaining: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const usageSchema = new Schema<IUsage>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
  },
  type: {
    type: String,
    enum: ["analysis", "clarity_scan", "chat_message", "storage"],
    required: true,
  },
  count: {
    type: Number,
    default: 0,
    min: 0,
  },
  period: {
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
  },
  limits: {
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    used: {
      type: Number,
      default: 0,
      min: 0,
    },
    remaining: {
      type: Number,
      required: true,
      min: 0,
    },
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

// Ensure either user or company is set, but not both
usageSchema.pre("save", function (next) {
  if (!this.user && !this.company) {
    next(new Error("Either user or company must be set"));
  }
  if (this.user && this.company) {
    next(new Error("Cannot set both user and company"));
  }
  this.updatedAt = new Date();
  next();
});

// Update remaining count when used count changes
usageSchema.pre("save", function (next) {
  this.limits.remaining = this.limits.total - this.limits.used;
  next();
});

export const Usage = mongoose.model<IUsage>("Usage", usageSchema);
