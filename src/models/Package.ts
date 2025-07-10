import mongoose, { Document, Schema } from "mongoose";

export interface IPackage extends Document {
  name: string;
  type: "individual" | "company";
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    maxAnalyses: number;
    maxClarityScans: number;
    maxChatMessages: number;
    maxUsers?: number;
    advancedReporting: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    aiChatAdvisor: false | "basic" | "strategic" | "custom";
    businessImpactEstimates: boolean;
    whiteLabeledReports: boolean;
    goalSetting: boolean;
    customDashboards: boolean;
    teamManagement: boolean;
    exportableReports: boolean;
    advancedImplementationTracking: boolean;
    slaSupport: boolean;
    features: Record<string, boolean>;
  };
  trialDays: number;
  status: "active" | "deprecated" | "hidden";
  stripePriceId: {
    monthly: string;
    yearly: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>({
  name: {
    type: String,
    required: [true, "Package name is required"],
    trim: true,
  },
  type: {
    type: String,
    enum: ["individual", "company"],
    required: true,
  },
  price: {
    monthly: {
      type: Number,
      required: true,
      min: 0,
    },
    yearly: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  features: {
    maxAnalyses: {
      type: Number,
      required: true,
      min: -1, // -1 for unlimited
    },
    maxClarityScans: {
      type: Number,
      required: true,
      min: -1, // -1 for unlimited
    },
    maxChatMessages: {
      type: Number,
      required: true,
      min: -1, // -1 for unlimited
    },
    maxUsers: {
      type: Number,
      min: -1, // -1 for unlimited
    },
    advancedReporting: {
      type: Boolean,
      default: false,
    },
    apiAccess: {
      type: Boolean,
      default: false,
    },
    customBranding: {
      type: Boolean,
      default: false,
    },
    prioritySupport: {
      type: Boolean,
      default: false,
    },
    aiChatAdvisor: {
      type: String,
      enum: [false, "basic", "strategic", "custom"],
      default: false,
    },
    businessImpactEstimates: {
      type: Boolean,
      default: false,
    },
    whiteLabeledReports: {
      type: Boolean,
      default: false,
    },
    goalSetting: {
      type: Boolean,
      default: false,
    },
    customDashboards: {
      type: Boolean,
      default: false,
    },
    teamManagement: {
      type: Boolean,
      default: false,
    },
    exportableReports: {
      type: Boolean,
      default: false,
    },
    advancedImplementationTracking: {
      type: Boolean,
      default: false,
    },
    slaSupport: {
      type: Boolean,
      default: false,
    },
  },
  trialDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["active", "deprecated", "hidden"],
    default: "active",
  },
  stripePriceId: {
    monthly: {
      type: String,
      required: true,
    },
    yearly: {
      type: String,
      required: true,
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

// Update timestamps
packageSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Package = mongoose.model<IPackage>("Package", packageSchema);
