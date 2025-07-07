import mongoose, { Document, Schema } from "mongoose";

export interface IRedditPost extends Document {
  userId: mongoose.Types.ObjectId;
  redditPostId: string;
  postUrl: string;
  subreddit: string;
  topicKeywords: string[];
  productContext: string;
  tone: "casual" | "frustrated" | "curious";
  postContent: string;
  title?: string;
  karma?: number;
  comments?: number;
  status: "active" | "deleted" | "removed";
  createdAt: Date;
  updatedAt: Date;
}

const redditPostSchema = new Schema<IRedditPost>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  redditPostId: {
    type: String,
    required: true,
    unique: true,
  },
  postUrl: {
    type: String,
    required: true,
  },
  subreddit: {
    type: String,
    required: true,
  },
  topicKeywords: [
    {
      type: String,
      required: true,
    },
  ],
  productContext: {
    type: String,
    required: true,
  },
  tone: {
    type: String,
    enum: ["casual", "frustrated", "curious"],
    default: "casual",
  },
  postContent: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  karma: {
    type: Number,
    default: 0,
  },
  comments: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "deleted", "removed"],
    default: "active",
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
redditPostSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
redditPostSchema.index({ userId: 1, createdAt: -1 });
redditPostSchema.index({ subreddit: 1, createdAt: -1 });
redditPostSchema.index({ redditPostId: 1 }, { unique: true });
redditPostSchema.index({ status: 1 });

export const RedditPost = mongoose.model<IRedditPost>(
  "RedditPost",
  redditPostSchema
);
