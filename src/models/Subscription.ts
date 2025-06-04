import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";
import { ICompany } from "./Company";
import { IPackage } from "./Package";

export interface ISubscription extends Document {
  user?: IUser["_id"];
  company?: ICompany["_id"];
  package: IPackage["_id"];
  status: "trial" | "active" | "canceled" | "paused" | "expired";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  usage: {
    analyses: number;
    lastReset: Date;
  };
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
  },
  package: {
    type: Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  status: {
    type: String,
    enum: ["trial", "active", "canceled", "paused", "expired"],
    default: "trial",
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    required: true,
  },
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
  },
  usage: {
    analyses: {
      type: Number,
      default: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
  },
  trialEndsAt: {
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

// Ensure either user or company is set, but not both
subscriptionSchema.pre("save", function (next) {
  if (!this.user && !this.company) {
    next(new Error("Either user or company must be set"));
  }
  if (this.user && this.company) {
    next(new Error("Cannot set both user and company"));
  }
  this.updatedAt = new Date();
  next();
});

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
