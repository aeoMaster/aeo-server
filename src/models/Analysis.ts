import mongoose, { Document, Schema } from "mongoose";

export interface IAnalysis extends Document {
  user: mongoose.Types.ObjectId;
  type: "content" | "url";
  content?: string;
  url?: string;
  company?: mongoose.Types.ObjectId;
  companyName?: string;
  section?: string;
  score: number;
  category_scores?: {
    structured_data: number;
    speakable_ready: number;
    snippet_conciseness: number;
    crawler_access: number;
    freshness_meta: number;
    e_e_a_t_signals: number;
    media_alt_caption: number;
    hreflang_lang_meta: number;
    answer_upfront: number;
  };
  fixes?: Array<{
    problem: string;
    example: string;
    fix: string;
    impact: "high" | "med" | "low";
    category: string;
    effort: "low" | "medium" | "high";
    validation: string[];
  }>;
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
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
  },
  companyName: String,
  section: String,
  score: {
    type: Number,
    // required: true,
  },
  category_scores: {
    structured_data: Number,
    speakable_ready: Number,
    snippet_conciseness: Number,
    crawler_access: Number,
    freshness_meta: Number,
    e_e_a_t_signals: Number,
    media_alt_caption: Number,
    hreflang_lang_meta: Number,
    answer_upfront: Number,
  },
  fixes: [
    {
      problem: String,
      example: String,
      fix: String,
      impact: {
        type: String,
        enum: ["high", "med", "low"],
      },
      category: String,
      effort: {
        type: String,
        enum: ["low", "medium", "high"],
      },
      validation: [String],
    },
  ],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better query performance
analysisSchema.index({ user: 1, createdAt: -1 });
analysisSchema.index({ company: 1, createdAt: -1 });
analysisSchema.index({ url: 1, createdAt: -1 });

export const Analysis = mongoose.model<IAnalysis>("Analysis", analysisSchema);
