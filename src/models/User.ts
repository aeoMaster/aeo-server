import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  company?: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "user" | "viewer";
  subscription?: mongoose.Types.ObjectId;
  stripeCustomerId?: string;
  status: "active" | "suspended" | "deleted";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function (this: IUser) {
      return !this.googleId;
    },
    minlength: [8, "Password must be at least 8 characters long"],
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
  },
  role: {
    type: String,
    enum: ["owner", "admin", "user", "viewer"],
    default: "user",
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: "Subscription",
  },
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true,
  },
  status: {
    type: String,
    enum: ["active", "suspended", "deleted"],
    default: "active",
  },
  lastLogin: {
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = new Date();
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
