import { Request, Response, NextFunction } from "express";
import { PlatformToken } from "../models/PlatformToken";
import { AppError } from "../middleware/errorHandler";

export class OAuthController {
  static async getLinkedInAuthUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
      const scope = "openid profile email w_member_social";
      const { blogId } = req.query;

      if (!clientId || !redirectUri) {
        throw new AppError(500, "LinkedIn configuration missing");
      }

      // Create state with both userId and blogId
      const state = JSON.stringify({
        userId: req.user?._id,
        blogId: blogId || null,
      });

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;

      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }

  static async handleLinkedInCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error("LinkedIn OAuth error:", error, error_description);
        return res.status(400).json({
          status: "error",
          message: `LinkedIn authorization failed: ${error_description || error}`,
          error: error,
          error_description: error_description,
        });
      }

      if (!code || !state) {
        throw new AppError(400, "Invalid callback parameters");
      }

      // Parse state to get userId and blogId
      let stateData;
      try {
        stateData = JSON.parse(decodeURIComponent(state as string));
      } catch (error) {
        throw new AppError(400, "Invalid state parameter");
      }

      const { userId, blogId } = stateData;
      if (!userId) {
        throw new AppError(400, "Invalid state: missing userId");
      }

      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new AppError(500, "LinkedIn configuration missing");
      }

      // Exchange code for access token
      const tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code as string,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!tokenResponse.ok) {
        throw new AppError(400, "Failed to get LinkedIn access token");
      }

      const tokenData = await tokenResponse.json();

      // With OpenID Connect, we get user info from the ID token or userinfo endpoint
      let profile;

      if (tokenData.id_token) {
        // Decode the ID token to get user info
        const idTokenPayload = JSON.parse(
          Buffer.from(tokenData.id_token.split(".")[1], "base64").toString()
        );
        profile = {
          id: idTokenPayload.sub,
          localizedFirstName: idTokenPayload.given_name,
          localizedLastName: idTokenPayload.family_name,
          name: idTokenPayload.name,
        };
      } else {
        // Fallback to userinfo endpoint
        const profileResponse = await fetch(
          "https://api.linkedin.com/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        );

        if (!profileResponse.ok) {
          throw new AppError(400, "Failed to get LinkedIn profile");
        }

        const userInfo = await profileResponse.json();
        profile = {
          id: userInfo.sub,
          localizedFirstName: userInfo.given_name,
          localizedLastName: userInfo.family_name,
          name: userInfo.name,
        };
      }

      // Save or update token
      await PlatformToken.findOneAndUpdate(
        { user: userId, platform: "linkedin" },
        {
          user: userId,
          platform: "linkedin",
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : undefined,
          platformUserId: profile.id,
          platformUsername:
            profile.name ||
            profile.localizedFirstName + " " + profile.localizedLastName,
          isActive: true,
          needsReauth: false, // Clear the re-auth flag
          lastUsed: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log("profile", profile);
      console.log("blogId", blogId);
      // Redirect to frontend with blogId if provided
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      console.log(
        "frontendUrl",
        `${frontendUrl}/dashboard/blogs/${blogId}?platform=linkedin`
      );

      if (blogId) {
        return res.redirect(
          `${frontendUrl}/dashboard/blogs/${blogId}?platform=linkedin`
        );
      } else {
        return res.redirect(`${frontendUrl}/dashboard/blogs?platform=linkedin`);
      }
    } catch (error) {
      next(error);
    }
  }

  // Medium OAuth methods removed - Medium API is deprecated

  // Medium OAuth callback removed - Medium API is deprecated

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

  static async disconnectPlatform(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)._id;
      const { platform } = req.params;

      await PlatformToken.findOneAndUpdate(
        { user: userId, platform },
        { isActive: false }
      );

      res.json({ message: `${platform} account disconnected successfully` });
    } catch (error) {
      next(error);
    }
  }

  static async reconnectPlatform(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)._id;
      const { platform } = req.params;
      const { blogId } = req.query;

      // Delete existing token to force re-authentication
      await PlatformToken.findOneAndDelete({ user: userId, platform });

      // Generate new auth URL with updated scopes
      let authUrl;
      if (platform === "linkedin") {
        const clientId = process.env.LINKEDIN_CLIENT_ID;
        const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
        const scope = "openid profile email w_member_social";

        if (!clientId || !redirectUri) {
          throw new AppError(500, "LinkedIn configuration missing");
        }

        const state = JSON.stringify({
          userId: userId,
          blogId: blogId || null,
        });

        authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
      } else {
        throw new AppError(400, "Unsupported platform");
      }

      res.json({
        authUrl,
        message: `Please re-authenticate with ${platform} to get updated permissions`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTokenInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const { platform } = req.params;

      const token = await PlatformToken.findOne({
        user: userId,
        platform,
        isActive: true,
      });

      if (!token) {
        return res
          .status(404)
          .json({ message: `${platform} account not connected` });
      }

      return res.json({
        platform: token.platform,
        platformUsername: token.platformUsername,
        lastUsed: token.lastUsed,
        expiresAt: token.expiresAt,
        isExpired: token.expiresAt ? token.expiresAt < new Date() : false,
        // Note: We can't see the actual scopes from the token, but we can show when it was created
        createdAt: token.createdAt,
      });
    } catch (error) {
      return next(error);
    }
  }
}
