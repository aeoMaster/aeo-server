import { Request, Response, NextFunction } from "express";
import { BlogService } from "../services/blogService";
import { PlatformToken } from "../models/PlatformToken";
import { z } from "zod";

// Validation schemas
const createBlogSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  tags: z.array(z.string()).optional(),
  seoData: z
    .object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  featuredImage: z.string().url().optional(),
});

const updateBlogSchema = createBlogSchema.partial();

const publishBlogSchema = z.object({
  platforms: z.array(z.enum(["linkedin"])).optional(),
});

export class BlogController {
  static async createBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const blogData = createBlogSchema.parse(req.body);

      const blog = await BlogService.createBlog(userId, blogData);
      res.status(201).json(blog);
    } catch (error) {
      next(error);
    }
  }

  static async getBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { status, page, limit, search, tags } = req.query;

      const options = {
        status: status as "draft" | "published" | "archived" | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        tags: tags
          ? ((Array.isArray(tags) ? tags : [tags]) as string[])
          : undefined,
      };

      const result = await BlogService.getBlogs(userId, options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getBlogById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;

      const blog = await BlogService.getBlogById(id, userId);
      res.json(blog);
    } catch (error) {
      next(error);
    }
  }

  static async updateBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;
      const updateData = updateBlogSchema.parse(req.body);

      const blog = await BlogService.updateBlog(id, userId, updateData);
      res.json(blog);
    } catch (error) {
      next(error);
    }
  }

  static async deleteBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;

      const result = await BlogService.deleteBlog(id, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async publishBlog(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;
      const { platforms } = publishBlogSchema.parse(req.body);

      const blog = await BlogService.publishBlog(id, userId, platforms);

      // Check if any platform is unauthorized
      const unauthorizedPlatforms =
        platforms?.filter(
          (platform) => blog.publishStatus[platform] === "unauthorized"
        ) || [];

      if (unauthorizedPlatforms.length > 0) {
        // Mark unauthorized platforms as needing re-authentication (but keep them visible)
        for (const platform of unauthorizedPlatforms) {
          await PlatformToken.findOneAndUpdate(
            { user: userId, platform },
            {
              isActive: true, // Keep it active so it shows up
              needsReauth: true, // Mark as needing re-authentication
            }
          );
        }

        return res.status(401).json({
          ...blog,
          message: "Some platforms require re-authentication",
          requiresReauth: true,
          platformsNeedingReauth: unauthorizedPlatforms,
        });
      }

      return res.json(blog);
    } catch (error) {
      return next(error);
    }
  }

  static async getPublishStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)._id;
      const { id } = req.params;

      const status = await BlogService.getPublishStatus(id, userId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, tags, author } = req.query;

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        tags: tags
          ? ((Array.isArray(tags) ? tags : [tags]) as string[])
          : undefined,
        author: author as string | undefined,
      };

      const result = await BlogService.getPublicBlogs(options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicBlogById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      // Increment view count
      await BlogService.incrementViewCount(id);

      // Get blog (public blogs don't require user authentication)
      const blog = await BlogService.getBlogById(id, ""); // Empty string for public access
      res.json(blog);
    } catch (error) {
      next(error);
    }
  }

  static async getBlogStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;

      const stats = await BlogService.getBlogStats(userId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getConnectedPlatforms(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)._id;

      // Get user's connected platforms
      const connectedPlatforms = await PlatformToken.find({
        user: userId,
        isActive: true,
      }).select("platform platformUsername lastUsed needsReauth");

      // Define all available platforms
      const availablePlatforms = [
        {
          platform: "linkedin",
          name: "LinkedIn",
          description: "Share your content on LinkedIn",
          icon: "linkedin",
          isConnected: false,
          needsReauth: false,
          platformUsername: null,
          lastUsed: null,
        },
      ];

      // Merge connected platforms with available platforms
      const platformsWithStatus = availablePlatforms.map((available) => {
        const connected = connectedPlatforms.find(
          (cp) => cp.platform === available.platform
        );

        if (connected) {
          return {
            ...available,
            isConnected: true,
            needsReauth: connected.needsReauth || false,
            platformUsername: connected.platformUsername,
            lastUsed: connected.lastUsed,
          };
        }

        return available;
      });

      res.json(platformsWithStatus);
    } catch (error) {
      next(error);
    }
  }
}
