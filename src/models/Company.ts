import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

export interface ICompany extends Document {
  name: string;
  industry?: string;
  size?: string;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
