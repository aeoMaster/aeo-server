import mongoose, { Document, Schema } from "mongoose";

export interface ICompany extends Document {
  name: string;
  industry?: string;
  size?: string;
  owner: mongoose.Types.ObjectId;
  settings: {
    theme?: string;
    notifications?: boolean;
    [key: string]: any;
  };
  invitations: Array<{
    email: string;
    role: string;
    token: string;
    status: "pending" | "accepted" | "cancelled";
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  id: string;
  _id: string;
}

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    invitations: [
      {
        email: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          required: true,
        },
        token: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "cancelled"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Update timestamps
companySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Company = mongoose.model<ICompany>("Company", companySchema);
