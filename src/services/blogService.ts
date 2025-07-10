import { Blog, IBlog } from "../models/Blog";
import { AppError } from "../middleware/errorHandler";
import { LinkedInService } from "./platforms/linkedinService";
import mongoose from "mongoose";

export class BlogService {
  static async createBlog(userId: string, blogData: Partial<IBlog>) {
    try {
      const blog = await Blog.create({
        ...blogData,
        author: userId,
      });

      return blog;
    } catch (error) {
      console.error("Error creating blog:", error);
      throw new AppError(500, "Failed to create blog");
    }
  }

  static async getBlogs(
    userId: string,
    options: {
      status?: "draft" | "published" | "archived";
      page?: number;
      limit?: number;
      search?: string;
      tags?: string[];
    } = {}
  ) {
    try {
      const { status, page = 1, limit = 10, search, tags } = options;
      const skip = (page - 1) * limit;

      const query: any = { author: userId };

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      const [blogs, total] = await Promise.all([
        Blog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("author", "name email"),
        Blog.countDocuments(query),
      ]);

      return {
        blogs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting blogs:", error);
      throw new AppError(500, "Failed to get blogs");
    }
  }

  static async getBlogById(blogId: string, userId: string) {
    try {
      console.log("getBlogById called with:", { blogId, userId });

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(blogId)) {
        throw new AppError(400, "Invalid blog ID format");
      }

      const query: any = { _id: blogId };

      // If userId is provided, filter by author (private access)
      // If userId is empty, only show published blogs (public access)
      if (userId) {
        query.author = userId;
      } else {
        query.status = "published";
      }

      console.log("Query:", query);

      const blog = await Blog.findOne(query).populate("author", "name email");

      console.log("Found blog:", blog ? "Yes" : "No");

      if (!blog) {
        throw new AppError(404, "Blog not found");
      }

      return blog;
    } catch (error) {
      console.error("Error in getBlogById:", error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, "Failed to get blog");
    }
  }

  static async updateBlog(
    blogId: string,
    userId: string,
    updateData: Partial<IBlog>
  ) {
    try {
      const blog = await Blog.findOneAndUpdate(
        { _id: blogId, author: userId },
        updateData,
        { new: true, runValidators: true }
      ).populate("author", "name email");

      if (!blog) {
        throw new AppError(404, "Blog not found");
      }

      return blog;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error updating blog:", error);
      throw new AppError(500, "Failed to update blog");
    }
  }

  static async deleteBlog(blogId: string, userId: string) {
    try {
      const blog = await Blog.findOneAndDelete({ _id: blogId, author: userId });

      if (!blog) {
        throw new AppError(404, "Blog not found");
      }

      return { message: "Blog deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error deleting blog:", error);
      throw new AppError(500, "Failed to delete blog");
    }
  }

  static async publishBlog(
    blogId: string,
    userId: string,
    platforms: string[] = []
  ) {
    try {
      const blog = await Blog.findOne({ _id: blogId, author: userId });
      if (!blog) {
        throw new AppError(404, "Blog not found");
      }

      // Update blog status to published
      blog.status = "published";
      blog.publishedAt = new Date();

      // Initialize publish status for requested platforms
      if (platforms.length > 0) {
        platforms.forEach((platform) => {
          blog.publishStatus[platform] = "pending";
        });
      }

      await blog.save();

      // Publish to platforms if specified
      if (platforms.length > 0) {
        await this.publishToPlatforms(blog, platforms);
      }

      return blog;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error publishing blog:", error);
      throw new AppError(500, "Failed to publish blog");
    }
  }

  static async publishToPlatforms(blog: IBlog, platforms: string[]) {
    try {
      const publishPromises = platforms.map(async (platform) => {
        try {
          let result;
          switch (platform) {
            case "linkedin":
              result = await LinkedInService.publishPost(blog);
              break;
            default:
              throw new Error(`Unsupported platform: ${platform}`);
          }

          // Update blog with success status and external link
          blog.publishStatus[platform] = "success";
          blog.externalLinks[platform] = result.url;
          blog.publishErrors[platform] = undefined;
        } catch (error) {
          console.error(`Error publishing to ${platform}:`, error);

          // Check if it's a LinkedIn auth error
          if (platform === "linkedin" && (error as any).linkedinAuthRequired) {
            blog.publishStatus[platform] = "unauthorized";
            blog.publishErrors[platform] = "LINKEDIN_AUTH_REQUIRED";
          } else {
            blog.publishStatus[platform] = "failed";
            blog.publishErrors[platform] =
              error instanceof Error ? error.message : "Unknown error";
          }
        }
      });

      await Promise.all(publishPromises);
      await blog.save();
    } catch (error) {
      console.error("Error in publishToPlatforms:", error);
      throw error;
    }
  }

  static async getPublishStatus(blogId: string, userId: string) {
    try {
      const blog = await Blog.findOne({ _id: blogId, author: userId }).select(
        "publishStatus publishErrors externalLinks"
      );

      if (!blog) {
        throw new AppError(404, "Blog not found");
      }

      return {
        publishStatus: blog.publishStatus,
        publishErrors: blog.publishErrors,
        externalLinks: blog.externalLinks,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("Error getting publish status:", error);
      throw new AppError(500, "Failed to get publish status");
    }
  }

  static async getPublicBlogs(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      tags?: string[];
      author?: string;
    } = {}
  ) {
    try {
      const { page = 1, limit = 10, search, tags, author } = options;
      const skip = (page - 1) * limit;

      const query: any = { status: "published" };

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      if (author) {
        query.author = author;
      }

      const [blogs, total] = await Promise.all([
        Blog.find(query)
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("author", "name"),
        Blog.countDocuments(query),
      ]);

      return {
        blogs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting public blogs:", error);
      throw new AppError(500, "Failed to get public blogs");
    }
  }

  static async incrementViewCount(blogId: string) {
    try {
      await Blog.findByIdAndUpdate(blogId, { $inc: { viewCount: 1 } });
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  }

  static async getBlogStats(userId: string) {
    try {
      const stats = await Blog.aggregate([
        { $match: { author: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalViews: { $sum: "$viewCount" },
          },
        },
      ]);

      const totalBlogs = await Blog.countDocuments({ author: userId });
      const totalViews = await Blog.aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, total: { $sum: "$viewCount" } } },
      ]);

      return {
        totalBlogs,
        totalViews: totalViews[0]?.total || 0,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, views: stat.totalViews };
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("Error getting blog stats:", error);
      throw new AppError(500, "Failed to get blog stats");
    }
  }
}
