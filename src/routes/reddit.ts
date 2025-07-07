import { Router } from "express";
import { RedditController } from "../controllers/redditController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Test endpoint to check Reddit configuration
router.get("/test-config", (req, res) => {
  const config = {
    clientId: process.env.REDDIT_CLIENT_ID || "qMqysl5CfkLAIOLlw9mFZg",
    clientSecret: process.env.REDDIT_CLIENT_SECRET ? "SET" : "NOT_SET",
    refreshToken: process.env.REDDIT_REFRESH_TOKEN ? "SET" : "NOT_SET",
    authUrl: `https://www.reddit.com/api/v1/authorize?client_id=qMqysl5CfkLAIOLlw9mFZg&response_type=code&state=random123&redirect_uri=${encodeURIComponent("http://localhost:8080")}&scope=submit%20identity%20read&duration=permanent`,
  };

  res.json({
    message: "Reddit configuration status",
    config,
    instructions:
      "Use the authUrl to get an authorization code, then run: node get-reddit-refresh-token.js YOUR_CODE",
  });
});

// Test Reddit posting without authentication (for development)
router.post("/test-post", async (req, res) => {
  try {
    const { RedditService } = await import("../services/redditService");

    // Test the token generation directly
    console.log("🔄 Testing Reddit token generation...");

    // Test client credentials flow directly
    const credentials = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString("base64");

    console.log("🔑 Client ID:", process.env.REDDIT_CLIENT_ID);
    console.log(
      "🔑 Client Secret:",
      process.env.REDDIT_CLIENT_SECRET ? "SET" : "NOT_SET"
    );

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "AEO-Reddit-Bot/1.0",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "submit identity read",
      }),
    });

    console.log("📡 Reddit API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Reddit API Error:", errorText);
      throw new Error(`Reddit API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Reddit API Success:", data);

    const result = await RedditService.simplePost(
      req.body.title || "Test Post",
      req.body.body || "This is a test post",
      req.body.subreddit || "test"
    );
    res.json(result);
  } catch (error) {
    console.error("❌ Test post error:", error);
    res.status(500).json({
      error: "Failed to test Reddit posting",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Generate a Reddit seed post (requires auth)
router.post("/seed-post", authenticate, RedditController.generateSeedPost);

// Get user's Reddit post history (requires auth)
router.get("/history", authenticate, RedditController.getPostHistory);

// Delete a Reddit post (requires auth)
router.delete("/post/:postId", authenticate, RedditController.deletePost);

// Get subreddit suggestions (public)
router.get("/subreddit-suggestions", RedditController.getSubredditSuggestions);

// Get tone suggestions (public)
router.get("/tone-suggestions", RedditController.getToneSuggestions);

// Preview a Reddit post (does not post, just generates content; requires auth)
router.post("/preview", authenticate, RedditController.previewPost);

// Simple post to Reddit (requires auth)
router.post("/post", authenticate, RedditController.simplePost);

// Get Reddit account info (requires auth)
router.get("/account", authenticate, RedditController.getAccountInfo);

// Check Reddit status (requires auth)
router.get("/status", authenticate, RedditController.checkStatus);

export default router;
