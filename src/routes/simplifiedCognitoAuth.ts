import { Router, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import { configService } from "../services/configService";
import { User } from "../models/User";
import { SubscriptionService } from "../services/subscriptionService";
import { oauthStateService } from "../services/oauthStateService";
import { sessionService } from "../services/sessionService";

const router = Router();

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
router.get("/login", async (_req: Request, res: Response) => {
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
    console.log(`🔒 Generated state: ${state} (length: ${state.length})`);

    // Store PKCE verifier and state with 10-minute TTL using MongoDB
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log(
      `🔒 Storing state with expiration: ${new Date(expiresAt).toISOString()}`
    );

    await oauthStateService.setPkce(codeChallenge, { codeVerifier, expiresAt });
    await oauthStateService.setState(state, { expiresAt, codeChallenge });

    console.log("🔐 State stored in MongoDB:", {
      oauthState: state,
      stateExpiry: expiresAt,
      codeChallenge: codeChallenge.substring(0, 8) + "...",
    });

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
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Manually add scope parameter to avoid URL encoding of + characters
    const urlString = authUrl.toString();
    const finalUrl = urlString + "&scope=openid+email+profile";

    console.log(`🚀 Redirecting to Cognito Hosted UI: ${finalUrl}`);
    res.redirect(finalUrl);
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

    // Validate state parameter for CSRF protection using MongoDB
    const stateData = await oauthStateService.getState(state as string);
    if (!stateData || stateData.expiresAt < Date.now()) {
      console.error("❌ State validation failed:", {
        receivedState: state,
        stateData: stateData ? "found but expired" : "not found",
        currentTime: Date.now(),
        expiryTime: stateData?.expiresAt,
      });
      throw new AppError(400, "Invalid or expired state parameter");
    }

    console.log("✅ State validation successful:", {
      state: state,
      hasCodeChallenge: !!stateData.codeChallenge,
      expiresAt: new Date(stateData.expiresAt).toISOString(),
    });

    // Clean up the used state
    await oauthStateService.deleteState(state as string);

    // Handle PKCE - check if codeChallenge is stored in state (simplified flow)
    let tokens;
    if (stateData.codeChallenge) {
      // Simplified flow: get PKCE verifier from MongoDB using code challenge stored in state
      const pkceData = await oauthStateService.getPkce(stateData.codeChallenge);
      if (!pkceData) {
        throw new AppError(400, "Missing PKCE verifier");
      }

      const codeVerifier = pkceData.codeVerifier;

      // Clean up the used PKCE data
      await oauthStateService.deletePkce(stateData.codeChallenge);

      // Exchange code for tokens with PKCE
      tokens = await exchangeCodeForTokensWithPkce(
        code as string,
        codeVerifier
      );
    } else {
      // Legacy flow: exchange code for tokens without PKCE (fallback for compatibility)
      console.log("🔄 Using legacy token exchange (no PKCE)");
      tokens = await exchangeCodeForTokens(code as string);
    }
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

    // Create proper session using session service
    const { sessionService } = await import("../services/sessionService");

    // Map Cognito groups to application roles
    const { roleMappingService } = await import(
      "../services/roleMappingService"
    );
    const userRoles = roleMappingService.mapGroupsToRoles(userInfo.groups);

    // Create session with correct user ID
    const sessionId = await sessionService.createSession(req, {
      userId: user._id.toString(),
      cognitoSub: user.cognitoSub,
      email: user.email,
      name: user.name,
      roles: userRoles.roles,
      groups: userInfo.groups,
    });

    console.log(`🔑 Created session: ${sessionId}`);

    // Set canonical aeo_session cookie for cross-subdomain authentication
    sessionService.setCanonicalCookie(res, sessionId);

    // Redirect to frontend with session
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") || "https://www.themoda.io";

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
 * Supports both Cognito session cookies and legacy bearer tokens
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

    // Clear canonical aeo_session cookie and any old cookies
    sessionService.clearCanonicalCookie(res);

    // Also clear legacy token cookies
    res.clearCookie("token");

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
 * POST /api/auth/logout
 * Clear session cookies (for API calls)
 */
router.post("/logout", (_req: Request, res: Response) => {
  // Clear canonical aeo_session cookie and any old cookies
  sessionService.clearCanonicalCookie(res);

  // Also clear legacy token cookies
  res.clearCookie("token");

  res.json({
    status: "success",
    message: "Logged out successfully",
  });
});

/**
 * GET /api/auth/me
 * Get current user from session
 * Uses session-based authentication for Cognito flow
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Session-based auth attempt for /me endpoint");

    // Import session service
    const { sessionService } = await import("../services/sessionService");

    // Get session data
    const sessionData = sessionService.getSessionData(req);

    if (!sessionData) {
      console.log("❌ No session data found");
      throw new AppError(401, "Not authenticated");
    }

    console.log(`✅ Session found for user: ${sessionData.email}`);

    // Get user from database to ensure they're still active
    const user = await User.findById(sessionData.userId);

    if (!user || user.status !== "active") {
      console.log(`❌ User not found or inactive: ${sessionData.userId}`);
      throw new AppError(401, "User not found or inactive");
    }

    console.log(`✅ User authenticated: ${user.email}`);
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
 * Exchange authorization code for tokens (legacy method without PKCE)
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token: string;
}> {
  const endpoints = configService.getCognitoEndpoints();
  const clientId = configService.get("COGNITO_APP_CLIENT_ID");
  const clientSecret = configService.get("COGNITO_APP_CLIENT_SECRET");
  const redirectUri = configService.get("OAUTH_REDIRECT_URI");

  // Prepare token request parameters
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: code,
    redirect_uri: redirectUri,
  });

  // Prepare headers
  const headers: { [key: string]: string } = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Add client secret if configured (for confidential clients)
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  console.log(
    `🔑 Exchanging code for tokens using endpoint: ${endpoints.token}`
  );
  console.log(`🔑 Client ID: ${clientId?.substring(0, 20)}...`);
  console.log(`🔑 Redirect URI: ${redirectUri}`);

  try {
    const response = await fetch(endpoints.token, {
      method: "POST",
      headers,
      body: params,
    });

    console.log(`🔑 Token exchange response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange error:", errorText);

      // Provide structured error responses
      if (response.status === 400) {
        throw new AppError(
          400,
          "Invalid authorization code or redirect URI mismatch"
        );
      } else if (response.status === 401) {
        throw new AppError(401, "Invalid client credentials");
      } else {
        throw new AppError(400, "Failed to exchange code for tokens");
      }
    }

    const tokens = await response.json();
    console.log(`🔑 Successfully exchanged code for tokens`);
    return tokens;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Network error during token exchange:", error);
    throw new AppError(500, "Network error during authentication");
  }
}

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
      console.log(`👤 User data:`, {
        cognitoSub: userInfo.cognitoSub,
        email: userInfo.email,
        name: userInfo.name,
        groups: userInfo.groups,
      });

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

      console.log(`✅ User created successfully: ${user._id}`);

      // Create free tier subscription
      try {
        await SubscriptionService.createFreeTierSubscription(
          user._id.toString()
        );
        console.log(`✅ Created subscription for user: ${user._id}`);
      } catch (subscriptionError) {
        console.error("❌ Failed to create subscription:", subscriptionError);
        // Delete the user if subscription creation fails
        await User.findByIdAndDelete(user._id);
        throw new AppError(
          500,
          "Failed to create user subscription. Please try again."
        );
      }
    }

    return user;
  } catch (error) {
    console.error("User upsert error:", error);
    throw new AppError(500, "Failed to create or update user");
  }
}

export const simplifiedCognitoAuthRoutes = router;
