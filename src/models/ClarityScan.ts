import mongoose, { Document, Schema } from "mongoose";

export interface IssueReport {
  group: "Structure" | "Meta" | "Schema" | "Navigation" | "Content" | "Links";
  title: string;
  status: "pass" | "fail" | "warning";
  details: string;
  recommendation: string;
  selectorExample?: string;
}

export interface ScoreBlock {
  score: number;
  passed: string[];
  failed: string[];
  recommendations: string[];
  issues: IssueReport[];
}

export interface IClarityScan extends Document {
  url: string;
  title: string | null;
  globalScore: number;
  globalSummary: string;
  issues: IssueReport[];
  summaryByCategory: Record<string, ScoreBlock>;
  htmlSnapshot?: string;
  user?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const issueReportSchema = new Schema<IssueReport>({
  group: {
    type: String,
    enum: ["Structure", "Meta", "Schema", "Navigation", "Content", "Links"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pass", "fail", "warning"],
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  recommendation: {
    type: String,
    required: true,
  },
  selectorExample: String,
});

const scoreBlockSchema = new Schema<ScoreBlock>({
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  passed: [String],
  failed: [String],
  recommendations: [String],
  issues: [issueReportSchema],
});

const clarityScanSchema = new Schema<IClarityScan>({
  url: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  globalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  globalSummary: {
    type: String,
    required: true,
  },
  issues: [issueReportSchema],
  summaryByCategory: {
    type: Map,
    of: scoreBlockSchema,
  },
  htmlSnapshot: {
    type: String,
    select: false, // Don't include in regular queries to save bandwidth
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
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
clarityScanSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
clarityScanSchema.index({ url: 1, createdAt: -1 });
clarityScanSchema.index({ user: 1, createdAt: -1 });
clarityScanSchema.index({ globalScore: -1 });

export const ClarityScan = mongoose.model<IClarityScan>(
  "ClarityScan",
  clarityScanSchema
);
