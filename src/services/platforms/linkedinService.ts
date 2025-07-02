import { IBlog } from "../../models/Blog";
import { PlatformToken } from "../../models/PlatformToken";
import { AppError } from "../../middleware/errorHandler";

export class LinkedInService {
  static async publishPost(blog: IBlog) {
    try {
      // Get user's LinkedIn token
      const token = await PlatformToken.findOne({
        user: blog.author,
        platform: "linkedin",
        isActive: true,
      });
      console.log("token linkedin", token);

      if (!token) {
        throw new Error("LinkedIn account not connected");
      }

      // Check if token is expired
      if (token.expiresAt && token.expiresAt < new Date()) {
        throw new Error("LinkedIn token expired");
      }

      // Prepare LinkedIn post data
      const postData = {
        author: `urn:li:person:${token.platformUserId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: `${blog.title}\n\n${blog.excerpt || ""}\n\nRead more: [Your Blog URL]`,
            },
            shareMediaCategory: "NONE", // Changed from ARTICLE to NONE for text-only posts
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };
      console.log("postData linkedin", postData);
      // Make API call to LinkedIn
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postData),
      });
      if (!response.ok) {
        const errorData = await response.json();

        // Check if it's a permissions error
        if (
          response.status === 403 &&
          errorData.message?.includes("permissions")
        ) {
          const authError = new Error("LINKEDIN_AUTH_REQUIRED");
          (authError as any).statusCode = 401;
          (authError as any).linkedinAuthRequired = true;
          (authError as any).originalError = errorData.message;
          throw authError;
        }

        throw new Error(
          `LinkedIn API error: ${errorData.message || response.statusText}`
        );
      }

      const result = await response.json();

      // Update token last used
      token.lastUsed = new Date();
      await token.save();

      return {
        url: `https://www.linkedin.com/feed/update/${result.id}/`,
        id: result.id,
      };
    } catch (error) {
      console.error("LinkedIn publish error:", error);
      throw error;
    }
  }

  static async getProfile(userId: string) {
    try {
      const token = await PlatformToken.findOne({
        user: userId,
        platform: "linkedin",
        isActive: true,
      });

      if (!token) {
        throw new Error("LinkedIn account not connected");
      }

      const response = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch LinkedIn profile");
      }

      return await response.json();
    } catch (error) {
      console.error("LinkedIn profile error:", error);
      throw error;
    }
  }
}
