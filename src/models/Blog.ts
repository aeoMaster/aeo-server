import mongoose, { Document, Schema } from "mongoose";

export interface IBlog extends Document {
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  author: mongoose.Types.ObjectId;
  status: "draft" | "published" | "archived";
  publishedAt?: Date;
  source: "linkedin" | "medium" | "custom" | "crosspost";
  externalLinks: {
    linkedin?: string;
    medium?: string;
    [key: string]: string | undefined;
  };
  publishStatus: {
    linkedin?: "pending" | "success" | "failed" | "unauthorized";
    medium?: "pending" | "success" | "failed" | "unauthorized";
    [key: string]:
      | "pending"
      | "success"
      | "failed"
      | "unauthorized"
      | undefined;
  };
  publishErrors: {
    linkedin?: string;
    medium?: string;
    [key: string]: string | undefined;
  };
  seoData?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  featuredImage?: string;
  readTime?: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"],
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, "Excerpt cannot exceed 500 characters"],
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "draft",
  },
  publishedAt: {
    type: Date,
  },
  source: {
    type: String,
    enum: ["linkedin", "medium", "custom", "crosspost"],
    default: "custom",
  },
  externalLinks: {
    linkedin: String,
    medium: String,
  },
  publishStatus: {
    linkedin: {
      type: String,
      enum: ["pending", "success", "failed", "unauthorized"],
    },
    medium: {
      type: String,
      enum: ["pending", "success", "failed", "unauthorized"],
    },
  },
  publishErrors: {
    linkedin: String,
    medium: String,
  },
  seoData: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    keywords: [String],
  },
  featuredImage: {
    type: String,
  },
  readTime: {
    type: Number,
    min: [1, "Read time must be at least 1 minute"],
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
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
blogSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // Set publishedAt when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Calculate read time if not set
  if (!this.readTime && this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
  }

  next();
});

// Index for better query performance
blogSchema.index({ author: 1, status: 1, createdAt: -1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1 });

export const Blog = mongoose.model<IBlog>("Blog", blogSchema);
