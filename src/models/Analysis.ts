import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

export interface IAnalysis extends Document {
  user: IUser["_id"];
  type: "content" | "url";
  content?: string;
  url?: string;
  company?: string;
  section?: string;
  score: number;
  metrics: {
    readability: number;
    engagement: number;
    seo: number;
    conversion: number;
    brandVoice: number;
    contentDepth: number;
    originality: number;
    technicalAccuracy: number;
  };
  feedback: string;
  improvements: string[];
  keywords?: {
    primary: string[];
    secondary: string[];
    longTail: string[];
  };
  sentiment?: "positive" | "neutral" | "negative";
  contentGaps?: string[];
  competitorAnalysis?: {
    strengths: string[];
    weaknesses: string[];
  };
  roiMetrics?: {
    potentialReach: number;
    engagementRate: number;
    conversionProbability: number;
  };
  contentStructure?: {
    headings: number;
    paragraphs: number;
    images: number;
    links: number;
  };
  targetAudience?: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
  rawAnalysis: string;
  createdAt: Date;
}

const analysisSchema = new Schema<IAnalysis>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["content", "url"],
    required: true,
  },
  content: String,
  url: String,
  company: String,
  section: String,
  score: {
    type: Number,
    // required: true,
  },
  metrics: {
    readability: Number,
    engagement: Number,
    seo: Number,
    conversion: Number,
    brandVoice: Number,
    contentDepth: Number,
    originality: Number,
    technicalAccuracy: Number,
  },
  feedback: {
    type: String,
    // required: true,
  },
  improvements: [String],
  keywords: {
    primary: [String],
    secondary: [String],
    longTail: [String],
  },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
  },
  contentGaps: [String],
  competitorAnalysis: {
    strengths: [String],
    weaknesses: [String],
  },
  roiMetrics: {
    potentialReach: Number,
    engagementRate: Number,
    conversionProbability: Number,
  },
  contentStructure: {
    headings: Number,
    paragraphs: Number,
    images: Number,
    links: Number,
  },
  targetAudience: {
    demographics: [String],
    interests: [String],
    painPoints: [String],
  },
  rawAnalysis: { type: Schema.Types.Mixed, required: true },
  result: { type: Schema.Types.Mixed, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Analysis = mongoose.model<IAnalysis>("Analysis", analysisSchema);
