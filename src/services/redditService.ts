import { AppError } from "../middleware/errorHandler";

interface RedditPostRequest {
  userId: string;
  targetSubreddit: string;
  topicKeywords: string[];
  productContext: string;
  tone?: "casual" | "frustrated" | "curious";
  simulateExperience?: boolean;
}

interface RedditPostResponse {
  success: boolean;
  postUrl: string;
  postText: string;
  subreddit: string;
  createdAt: string;
  redditPostId?: string;
}

interface RedditAccount {
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  karma: number;
  accountAge: number; // in days
}

export class RedditService {
  private static readonly REDDIT_API_BASE = "https://oauth.reddit.com";
  private static readonly REDDIT_AUTH_BASE = "https://www.reddit.com/api/v1";

  // Reddit API configuration
  private static readonly CLIENT_ID =
    process.env.REDDIT_CLIENT_ID || "qMqysl5CfkLAIOLlw9mFZg";
  private static readonly CLIENT_SECRET =
    process.env.REDDIT_CLIENT_SECRET || "GroKqGH4NfsUFM0qm66cSXf-eU7tEQ";
  private static readonly REFRESH_TOKEN =
    process.env.REDDIT_REFRESH_TOKEN || "";

  // In-memory token cache
  private static accessToken: string = "";
  private static tokenExpiresAt: Date = new Date(0);

  // Whitelist of subreddits that allow self-promotion or are generally friendly
  private static readonly ALLOWED_SUBREDDITS = [
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
  ];

  // Authentic post templates inspired by real Reddit posts
  private static readonly POST_TEMPLATES = {
    casual: [
      "I've been working on {topic} for a while now and I'm curious about your experiences. {question}",
      "Anyone else dealing with {topic}? I'm trying to figure out the best approach here.",
      "Quick question for the community: {question} I feel like I'm missing something obvious.",
      "What's your take on {topic}? I'm trying to understand {question}",
      "I'm exploring {topic} and wondering {question}",
    ],
    frustrated: [
      "Frustrated with {topic} right now. {problem} Anyone else experiencing this?",
      "I'm at my wit's end with {topic}. {problem} Any advice would be appreciated.",
      "It's crazy how much time I spend trying to figure out what's wrong with {topic}. {problem}",
      "I've tried everything I can think of for {topic}, but {problem}",
      "Why is {topic} so complicated? {problem} Surely there's a better way?",
    ],
    curious: [
      "I keep reading about {topic} but I'm not sure if it's real or just hype. {question}",
      "What's a good tool to check if my content is optimized for {topic}?",
      "Is {topic} just SEO rebranded or are there actual tools and tactics I should look into?",
      "I know SEO, but I feel like I'm behind on this whole {topic} wave. {question}",
      "Everyone's talking about {topic}. Has anyone actually benefited from tools in that area?",
    ],
  };

  static async generateSeedPost(
    request: RedditPostRequest
  ): Promise<RedditPostResponse> {
    try {
      // Validate subreddit
      if (
        !this.ALLOWED_SUBREDDITS.includes(request.targetSubreddit.toLowerCase())
      ) {
        throw new AppError(
          400,
          `Subreddit ${request.targetSubreddit} is not in the allowed list`
        );
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken();

      // Generate post content
      const postContent = await this.generatePostContent(request);

      // Post to Reddit
      const redditResponse = await this.postToReddit(
        accessToken,
        request.targetSubreddit,
        postContent
      );

      // Store post in database
      await this.storePostLog(request.userId, redditResponse, request);

      return {
        success: true,
        postUrl: redditResponse.permalink,
        postText: postContent,
        subreddit: request.targetSubreddit,
        createdAt: new Date().toISOString(),
        redditPostId: redditResponse.id,
      };
    } catch (error) {
      console.error("Reddit seed post generation error:", error);
      throw new AppError(500, "Failed to generate Reddit seed post");
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  public static async getValidAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    // Refresh the token
    await this.refreshAccessToken();
    return this.accessToken;
  }

  /**
   * Generate a new access token using client credentials
   */
  private static async refreshAccessToken(): Promise<void> {
    console.log(
      "🔄 Generating new Reddit access token using client credentials..."
    );

    try {
      // Use client credentials flow to get a new access token
      const credentials = Buffer.from(
        `${this.CLIENT_ID}:${this.CLIENT_SECRET}`
      ).toString("base64");

      const response = await fetch(
        "https://www.reddit.com/api/v1/access_token",
        {
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
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("❌ Failed to generate access token:", error);

        // Fallback to demo mode
        console.log("🎭 Falling back to demo mode...");
        this.accessToken = "demo_token";
        this.tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
        return;
      }

      const data = await response.json();

      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      console.log("✅ New Reddit access token generated successfully");
    } catch (error) {
      console.error("❌ Error generating access token:", error);

      // Fallback to demo mode
      console.log("🎭 Falling back to demo mode...");
      this.accessToken = "demo_token";
      this.tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
    }
  }

  static async generatePostContent(
    request: RedditPostRequest
  ): Promise<string> {
    const tone = request.tone || "casual";
    const templates = this.POST_TEMPLATES[tone];
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate topic-specific content
    const topic = request.topicKeywords.join(" ");
    const { question, problem } = this.generateTopicSpecificContent(request);

    let content = template
      .replace("{topic}", topic)
      .replace("{question}", question)
      .replace("{problem}", problem);

    // Add some natural variation
    content = this.addNaturalVariation(content);

    return content;
  }

  private static generateTopicSpecificContent(request: RedditPostRequest): {
    question: string;
    problem: string;
  } {
    // const { topicKeywords, productContext } = request; // Will be used for more specific content generation

    // Generate authentic questions based on topic keywords
    const questions = [
      "What tools or strategies have worked best for you?",
      "How do you measure success in this area?",
      "What are the biggest challenges you've faced?",
      "Any recommendations for getting started?",
      "What mistakes should I avoid?",
      "How do you stay up to date with best practices?",
      "Is there a simple tool that tells me what's missing?",
      "What's fundamentally wrong that I can't figure out?",
      "Are there actual tools and tactics I should look into?",
      "Has anyone actually benefited from tools in this area?",
      "Is this just hype or are there real benefits?",
      "What am I missing that's beyond basic SEO?",
    ];

    // Generate authentic problems based on topic keywords
    const problems = [
      "Everything seems to be working on paper, but the results aren't there.",
      "I keep getting conflicting advice from different sources.",
      "The tools I'm using aren't giving me the insights I need.",
      "I'm spending too much time on this without seeing progress.",
      "The competition seems to be doing something I'm missing.",
      "I'm not sure if I'm focusing on the right metrics.",
      "I've tried submitting sitemaps manually, using Search Console... still nothing.",
      "I've fixed my meta tags, structured data, internal links... still no traffic.",
      "I don't have time to manually post content across multiple platforms.",
      "I'm not technical and don't know where to start.",
      "I feel like I'm invisible on Google despite doing basic SEO.",
      "I wish there was a simple tool that audits it all in plain English.",
    ];

    return {
      question: questions[Math.floor(Math.random() * questions.length)],
      problem: problems[Math.floor(Math.random() * problems.length)],
    };
  }

  private static addNaturalVariation(content: string): string {
    // Add some natural language variations inspired by real Reddit posts
    const variations = [
      "Thanks in advance!",
      "Appreciate any help!",
      "Looking forward to hearing your thoughts.",
      "What do you think?",
      "Any insights would be great.",
      "Thanks for reading!",
      "Anyone else dealing with this?",
      "What am I missing here?",
      "Surely there's a better way?",
      "Any solutions?",
    ];

    // 60% chance to add a variation (more natural)
    if (Math.random() > 0.4) {
      const variation =
        variations[Math.floor(Math.random() * variations.length)];
      content += `\n\n${variation}`;
    }

    return content;
  }

  private static async postToReddit(
    accessToken: string,
    subreddit: string,
    content: string
  ): Promise<any> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "AEO-Reddit-Bot/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const postData = new URLSearchParams({
      sr: subreddit,
      title: this.generateTitle(content),
      text: content,
      kind: "self",
    });

    const response = await fetch(`${this.REDDIT_API_BASE}/api/submit`, {
      method: "POST",
      headers,
      body: postData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reddit API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    if (result.json && result.json.errors && result.json.errors.length > 0) {
      throw new Error(
        `Reddit submission error: ${JSON.stringify(result.json.errors)}`
      );
    }

    return {
      id: result.json.data.id,
      permalink: `https://reddit.com${result.json.data.permalink}`,
    };
  }

  static generateTitle(content: string): string {
    // Extract a question or key phrase from content for the title
    const lines = content.split("\n");
    const firstLine = lines[0];

    // If it starts with a question, use it
    if (firstLine.includes("?")) {
      return firstLine.substring(0, 300); // Reddit title limit
    }

    // Otherwise, create a generic title
    return "Looking for advice on this topic";
  }

  private static async storePostLog(
    userId: string,
    redditResponse: any,
    request: RedditPostRequest
  ): Promise<void> {
    try {
      const { RedditPost } = await import("../models/RedditPost");
      await new RedditPost({
        userId,
        redditPostId: redditResponse.id,
        postUrl: redditResponse.permalink,
        subreddit: request.targetSubreddit,
        topicKeywords: request.topicKeywords,
        productContext: request.productContext,
        tone: request.tone || "casual",
        postContent: redditResponse.postContent,
        createdAt: new Date(),
      }).save();
    } catch (error) {
      console.error("Failed to store Reddit post log:", error);
      // Continue without storing to database
    }
  }

  static async getPostHistory(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { RedditPost } = await import("../models/RedditPost");
      return await RedditPost.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Failed to get Reddit post history:", error);
      return [];
    }
  }

  /**
   * Simple post to Reddit (new endpoint)
   */
  static async simplePost(
    title: string,
    body: string,
    subreddit: string
  ): Promise<any> {
    try {
      // Validate subreddit
      if (!this.ALLOWED_SUBREDDITS.includes(subreddit.toLowerCase())) {
        throw new AppError(
          400,
          `Subreddit ${subreddit} is not in the allowed list`
        );
      }

      // Check if we have proper Reddit credentials
      const hasCredentials =
        this.REFRESH_TOKEN || process.env.REDDIT_ACCESS_TOKEN;

      if (!hasCredentials) {
        // Demo mode - simulate successful post
        console.log(
          "🎭 Demo mode: Simulating Reddit post (not actually posting)"
        );
        const demoPostId = Math.random().toString(36).substring(7);
        const demoUrl = `https://reddit.com/r/${subreddit}/comments/${demoPostId}/demo_post`;

        return {
          success: true,
          postUrl: demoUrl,
          postId: demoPostId,
          title,
          subreddit,
          createdAt: new Date().toISOString(),
          demo: true,
          message: "Demo mode - post was not actually submitted to Reddit",
        };
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken();

      // Post to Reddit
      const redditResponse = await this.postToReddit(
        accessToken,
        subreddit,
        body
      );

      return {
        success: true,
        postUrl: redditResponse.permalink,
        postId: redditResponse.id,
        title,
        subreddit,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Reddit simple post error:", error);

      // Fallback to demo mode if Reddit API fails
      console.log("🎭 Fallback to demo mode due to Reddit API error");
      const demoPostId = Math.random().toString(36).substring(7);
      const demoUrl = `https://reddit.com/r/${subreddit}/comments/${demoPostId}/demo_post`;

      return {
        success: true,
        postUrl: demoUrl,
        postId: demoPostId,
        title,
        subreddit,
        createdAt: new Date().toISOString(),
        demo: true,
        message: "Demo mode - Reddit API failed, simulating successful post",
      };
    }
  }

  /**
   * Get Reddit account info
   */
  static async getAccountInfo(): Promise<any> {
    try {
      const accessToken = await this.getValidAccessToken();

      const response = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "AEO-Reddit-Bot/1.0",
        },
      });

      if (!response.ok) {
        throw new AppError(500, "Failed to get Reddit account info");
      }

      const userInfo = await response.json();

      return {
        username: userInfo.name,
        karma: userInfo.total_karma || 0,
        accountAge: Math.floor(
          (Date.now() - userInfo.created_utc * 1000) / (1000 * 60 * 60 * 24)
        ),
      };
    } catch (error) {
      console.error("Error getting Reddit account info:", error);
      throw new AppError(500, "Failed to get Reddit account info");
    }
  }

  /**
   * Check if Reddit is properly configured and working
   */
  static async checkRedditStatus(): Promise<any> {
    try {
      const status: {
        configured: boolean;
        hasRefreshToken: boolean;
        hasAccessToken: boolean;
        canPost: boolean;
        accountInfo: any;
        error: string | null;
      } = {
        configured: false,
        hasRefreshToken: !!this.REFRESH_TOKEN,
        hasAccessToken: !!process.env.REDDIT_ACCESS_TOKEN,
        canPost: false,
        accountInfo: null,
        error: null,
      };

      // Try to get account info to test the connection
      try {
        const accountInfo = await this.getAccountInfo();
        status.configured = true;
        status.canPost = true;
        status.accountInfo = accountInfo;
      } catch (error) {
        status.error = error instanceof Error ? error.message : String(error);
      }

      return status;
    } catch (error) {
      return {
        configured: false,
        hasRefreshToken: !!this.REFRESH_TOKEN,
        hasAccessToken: !!process.env.REDDIT_ACCESS_TOKEN,
        canPost: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async deletePost(userId: string, postId: string): Promise<boolean> {
    try {
      const { RedditPost } = await import("../models/RedditPost");
      const post = await RedditPost.findOne({ _id: postId, userId });

      if (!post) {
        return false;
      }

      // Delete from Reddit API
      const accessToken = await this.getValidAccessToken();
      await this.deleteFromReddit(accessToken, post.redditPostId);

      // Delete from database
      await RedditPost.findByIdAndDelete(postId);
      return true;
    } catch (error) {
      console.error("Error deleting Reddit post:", error);
      return false;
    }
  }

  private static async deleteFromReddit(
    accessToken: string,
    postId: string
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "AEO-Reddit-Bot/1.0",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const response = await fetch(`${this.REDDIT_API_BASE}/api/del`, {
      method: "POST",
      headers,
      body: new URLSearchParams({ id: `t3_${postId}` }),
    });

    if (!response.ok) {
      console.warn(
        `Failed to delete Reddit post ${postId}: ${response.status}`
      );
    }
  }
}
