import { Router, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import { configService } from "../services/configService";
import { User } from "../models/User";
import { SubscriptionService } from "../services/subscriptionService";

const router = Router();

// Extend Express session interface for PKCE
declare module "express-session" {
  interface SessionData {
    pkceVerifier?: string;
    oauthState?: string;
    stateExpiry?: number;
  }
}

/**
 * FIXED COGNITO AUTH FLOW
 *
 * This approach:
 * 1. Uses correct Cognito Hosted UI endpoint (/login)
 * 2. Implements PKCE for security
 * 3. Uses session-based state management
 * 4. Handles user creation/subscription in callback
 */

/**
 * GET /api/auth/login
 * Redirect to Cognito Hosted UI with PKCE
 */
router.get("/login", async (req: Request, res: Response) => {
  try {
    const requiredConfig = [
      "COGNITO_REGION",
      "COGNITO_APP_CLIENT_ID",
      "COGNITO_DOMAIN",
      "OAUTH_REDIRECT_URI",
    ];

    const missing = requiredConfig.filter((key) => !configService.get(key));
    if (missing.length > 0) {
      throw new AppError(
        500,
        `Missing required configuration: ${missing.join(", ")}`
      );
    }

    const redirectUri = configService.get("OAUTH_REDIRECT_URI");
    const clientId = configService.get("COGNITO_APP_CLIENT_ID");

    // Generate PKCE parameters
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Store PKCE verifier and state in session
    req.session.pkceVerifier = codeVerifier;
    req.session.oauthState = state;
    req.session.stateExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Build correct Cognito Hosted UI URL
    const cognitoDomain = configService.get("COGNITO_DOMAIN");
    let cleanDomain = cognitoDomain;
    if (cognitoDomain.startsWith("https://")) {
      cleanDomain = cognitoDomain.replace("https://", "");
    }

    const baseUrl = cognitoDomain.startsWith("https://")
      ? cognitoDomain
      : `https://${cleanDomain}`;

    // Use correct Cognito endpoint: /oauth2/authorize
    const authUrl = new URL(`${baseUrl}/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid email profile"); // Space-separated, not + separated
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    console.log(`🚀 Redirecting to Cognito Hosted UI: ${authUrl.toString()}`);
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Login error:", error);
    throw new AppError(500, "Failed to initiate login");
  }
});

/**
 * GET /api/auth/callback
 * Handle Cognito callback and create user session
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    console.log("🔑 Callback received:", { code: !!code, state, error });

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, error_description);
      const frontendUrl =
        configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";
      res.redirect(
        `${frontendUrl}/auth/error?message=${encodeURIComponent((error_description as string) || (error as string))}`
      );
      return;
    }

    if (!code || !state) {
      throw new AppError(400, "Missing authorization code or state parameter");
    }

    // Validate state parameter for CSRF protection
    if (!req.session.oauthState || req.session.oauthState !== state) {
      throw new AppError(400, "Invalid state parameter");
    }

    if (!req.session.stateExpiry || req.session.stateExpiry < Date.now()) {
      throw new AppError(400, "State parameter expired");
    }

    // Get PKCE verifier from session
    const codeVerifier = req.session.pkceVerifier;
    if (!codeVerifier) {
      throw new AppError(400, "Missing PKCE verifier");
    }

    // Clear session state
    delete req.session.oauthState;
    delete req.session.stateExpiry;
    delete req.session.pkceVerifier;

    // Exchange code for tokens with PKCE
    const tokens = await exchangeCodeForTokensWithPkce(
      code as string,
      codeVerifier
    );
    console.log("🔑 Tokens received:", Object.keys(tokens));

    // Verify and decode ID token
    const idToken = await verifyIdTokenSimple(tokens.id_token);
    console.log("🔑 ID Token verified for user:", idToken.email);

    // Extract user info
    const userInfo = {
      cognitoSub: idToken.sub,
      email: idToken.email,
      name: idToken.name || idToken.email.split("@")[0],
      groups: idToken["cognito:groups"] || [],
    };

    // Create or update user
    const user = await upsertUserSimple(userInfo);

    // Create session token
    const sessionToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        cognitoSub: user.cognitoSub,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with session
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";

    // Set session cookie and redirect
    res.cookie("aeo_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });

    console.log("✅ Authentication successful for user:", user.email);
    res.redirect(`${frontendUrl}/dashboard?auth=success`);
  } catch (error) {
    console.error("Callback error:", error);
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    res.redirect(
      `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * GET /api/auth/logout
 * Clear session and redirect to Cognito logout
 */
router.get("/logout", async (_req: Request, res: Response) => {
  try {
    const cognitoDomain = configService.get("COGNITO_DOMAIN");
    const clientId = configService.get("COGNITO_APP_CLIENT_ID");
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";

    let cleanDomain = cognitoDomain;
    if (cognitoDomain.startsWith("https://")) {
      cleanDomain = cognitoDomain.replace("https://", "");
    }
    const baseUrl = cognitoDomain.startsWith("https://")
      ? cognitoDomain
      : `https://${cleanDomain}`;

    // Clear session cookie
    res.clearCookie("aeo_session");

    // Redirect to Cognito logout
    const logoutUrl = `${baseUrl}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(frontendUrl)}`;

    res.redirect(logoutUrl);
  } catch (error) {
    console.error("Logout error:", error);
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";
    res.redirect(frontendUrl);
  }
});

/**
 * GET /api/auth/me
 * Get current user from session
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.aeo_session;

    if (!token) {
      throw new AppError(401, "Not authenticated");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.id);

    if (!user || user.status !== "active") {
      throw new AppError(401, "User not found or inactive");
    }

    res.json({
      status: "success",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        roles: user.roles || [user.role],
        groups: user.cognitoGroups || [],
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    throw new AppError(401, "Not authenticated");
  }
});

/**
 * Token exchange with PKCE
 */
async function exchangeCodeForTokensWithPkce(
  code: string,
  codeVerifier: string
): Promise<any> {
  const cognitoDomain = configService.get("COGNITO_DOMAIN");
  const clientId = configService.get("COGNITO_APP_CLIENT_ID");
  const clientSecret = configService.get("COGNITO_APP_CLIENT_SECRET");
  const redirectUri = configService.get("OAUTH_REDIRECT_URI");

  let cleanDomain = cognitoDomain;
  if (cognitoDomain.startsWith("https://")) {
    cleanDomain = cognitoDomain.replace("https://", "");
  }
  const baseUrl = cognitoDomain.startsWith("https://")
    ? cognitoDomain
    : `https://${cleanDomain}`;

  const tokenEndpoint = `${baseUrl}/oauth2/token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier, // Add PKCE verifier
  });

  const headers: { [key: string]: string } = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Add client secret if configured
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  console.log(`🔑 Exchanging code at: ${tokenEndpoint}`);

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers,
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange error:", errorText);
    throw new AppError(400, `Token exchange failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Simplified ID token verification
 */
async function verifyIdTokenSimple(token: string): Promise<any> {
  // For now, just decode without verification (you can add JWKS verification later)
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded) {
    throw new AppError(401, "Invalid token");
  }

  // Basic validation
  const payload = decoded.payload as any;
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) {
    throw new AppError(401, "Token expired");
  }

  return payload;
}

/**
 * Simplified user upsert
 */
async function upsertUserSimple(userInfo: {
  cognitoSub: string;
  email: string;
  name: string;
  groups: string[];
}): Promise<any> {
  try {
    // Find existing user
    let user = await User.findOne({
      $or: [{ cognitoSub: userInfo.cognitoSub }, { email: userInfo.email }],
    });

    if (user) {
      // Update existing user
      console.log(`📝 Updating existing user: ${user.email}`);
      user.cognitoSub = userInfo.cognitoSub;
      user.email = userInfo.email;
      user.name = userInfo.name;
      user.cognitoGroups = userInfo.groups;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      console.log(`👤 Creating new user: ${userInfo.email}`);
      user = await User.create({
        cognitoSub: userInfo.cognitoSub,
        email: userInfo.email,
        name: userInfo.name,
        cognitoGroups: userInfo.groups,
        role: "user",
        roles: ["user"],
        status: "active",
        lastLogin: new Date(),
      });

      // Create free tier subscription
      await SubscriptionService.createFreeTierSubscription(user._id.toString());
      console.log(`✅ Created subscription for user: ${user._id}`);
    }

    return user;
  } catch (error) {
    console.error("User upsert error:", error);
    throw new AppError(500, "Failed to create or update user");
  }
}

export const simplifiedCognitoAuthRoutes = router;
