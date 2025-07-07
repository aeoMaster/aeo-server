import { Request, Response, NextFunction } from "express";
import { RedditService } from "../services/redditService";
import { z } from "zod";

// Validation schemas
const generateSeedPostSchema = z.object({
  targetSubreddit: z.string().min(1, "Subreddit is required"),
  topicKeywords: z
    .array(z.string().min(1))
    .min(1, "At least one topic keyword is required"),
  productContext: z
    .string()
    .min(10, "Product context must be at least 10 characters"),
  tone: z.enum(["casual", "frustrated", "curious"]).optional(),
  simulateExperience: z.boolean().optional().default(true),
});

export class RedditController {
  static async generateSeedPost(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)?._id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = generateSeedPostSchema.parse(req.body);

      const result = await RedditService.generateSeedPost({
        userId,
        ...validatedData,
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  static async getPostHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?._id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const skip = (page - 1) * limit;

      const posts = await RedditService.getPostHistory(userId, limit);
      const totalCount = posts.length; // For now, we'll get all posts and count

      return res.json({
        posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
          nextPage: page < Math.ceil(totalCount / limit) ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?._id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { postId } = req.params;
      const success = await RedditService.deletePost(userId, postId);

      if (!success) {
        return res
          .status(404)
          .json({ message: "Post not found or already deleted" });
      }

      return res.json({ message: "Post deleted successfully" });
    } catch (error) {
      return next(error);
    }
  }

  static async getSubredditSuggestions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { topic } = req.query;

      const suggestions = {
        SEO: ["SEO", "marketing", "digitalmarketing", "contentmarketing"],
        AI: ["artificial", "machinelearning", "techsupport", "programming"],
        Marketing: [
          "marketing",
          "digitalmarketing",
          "entrepreneur",
          "smallbusiness",
        ],
        "Web Development": ["webdev", "programming", "web_design", "freelance"],
        Business: ["entrepreneur", "smallbusiness", "startups", "marketing"],
        Technology: [
          "techsupport",
          "programming",
          "artificial",
          "machinelearning",
        ],
      };

      if (topic && suggestions[topic as keyof typeof suggestions]) {
        return res.json({
          subreddits: suggestions[topic as keyof typeof suggestions],
        });
      }

      return res.json({
        subreddits: [
          "SEO",
          "marketing",
          "techsupport",
          "webdev",
          "entrepreneur",
          "smallbusiness",
          "digitalmarketing",
          "contentmarketing",
          "startups",
          "freelance",
          "web_design",
          "programming",
        ],
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getToneSuggestions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      //   const { topicKeywords, productContext } = req.query;

      const suggestions = {
        casual: {
          description: "Friendly and approachable tone",
          examples: [
            "Hey everyone! I've been working on {topic} lately and I'm curious about your experiences.",
            "Anyone else dealing with {topic}? I'm trying to figure out the best approach here.",
          ],
        },
        frustrated: {
          description: "Expressing genuine frustration with a problem",
          examples: [
            "Frustrated with {topic} right now. Everything seems to be working on paper, but the results aren't there.",
            "I'm at my wit's end with {topic}. The tools I'm using aren't giving me the insights I need.",
          ],
        },
        curious: {
          description: "Learning and exploring tone",
          examples: [
            "I'm exploring {topic} and wondering what tools or strategies have worked best for you?",
            "What's your take on {topic}? I'm trying to understand the biggest challenges people face.",
          ],
        },
      };

      return res.json({ tones: suggestions });
    } catch (error) {
      return next(error);
    }
  }

  static async previewPost(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = generateSeedPostSchema.parse(req.body);

      // Generate preview without posting
      const preview = await RedditService.generatePostContent({
        userId: "preview",
        ...validatedData,
      });

      return res.json({
        preview,
        title: RedditService.generateTitle(preview),
        subreddit: validatedData.targetSubreddit,
        tone: validatedData.tone || "casual",
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Simple post to Reddit
   */
  static async simplePost(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title,
        body,
        subreddit,
        targetSubreddit,
        topicKeywords,
        productContext,
        tone,
        simulateExperience,
      } = req.body;

      // Handle both formats: direct post or seed post generation
      if (targetSubreddit && topicKeywords && productContext) {
        // Generate content using the seed post format
        const postContent = await RedditService.generatePostContent({
          userId: "system",
          targetSubreddit,
          topicKeywords,
          productContext,
          tone: tone || "casual",
          simulateExperience: simulateExperience !== false,
        });

        const generatedTitle = RedditService.generateTitle(postContent);

        const result = await RedditService.simplePost(
          generatedTitle,
          postContent,
          targetSubreddit
        );
        return res.json({
          ...result,
          generatedContent: postContent,
          originalRequest: {
            targetSubreddit,
            topicKeywords,
            productContext,
            tone,
            simulateExperience,
          },
        });
      } else if (title && body && subreddit) {
        // Direct post format
        const result = await RedditService.simplePost(title, body, subreddit);
        return res.json(result);
      } else {
        return res.status(400).json({
          message:
            "Either provide (title, body, subreddit) OR (targetSubreddit, topicKeywords, productContext, tone)",
        });
      }
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get Reddit account info
   */
  static async getAccountInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const accountInfo = await RedditService.getAccountInfo();
      return res.json(accountInfo);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Check Reddit configuration status
   */
  static async checkStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await RedditService.checkRedditStatus();
      return res.json(status);
    } catch (error) {
      return next(error);
    }
  }
}
