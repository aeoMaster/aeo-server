import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler";
import { jwtValidationService } from "../services/jwtValidationService";
import { sessionService } from "../services/sessionService";
import { roleMappingService } from "../services/roleMappingService";
import { cognitoService } from "../services/cognitoService";
import { User } from "../models/User";
import { SubscriptionService } from "../services/subscriptionService";

const router = Router();

// Validation schemas
const forgotPasswordSchema = z.object({
  username: z.string().email("Invalid email address"),
});

const confirmForgotPasswordSchema = z.object({
  username: z.string().email("Invalid email address"),
  code: z.string().min(1, "Code is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

// Store PKCE codes and state temporarily (in production, use Redis)
const pkceStore = new Map<
  string,
  { codeVerifier: string; expiresAt: number }
>();
const stateStore = new Map<string, { expiresAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();

    // Clean PKCE store
    for (const [key, value] of pkceStore.entries()) {
      if (value.expiresAt < now) {
        pkceStore.delete(key);
      }
    }

    // Clean state store
    for (const [key, value] of stateStore.entries()) {
      if (value.expiresAt < now) {
        stateStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * GET /auth/login
 * Initiates Cognito OAuth flow with PKCE
 */
router.get("/login", (_req: Request, res: Response) => {
  try {
    // Generate PKCE parameters
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Store PKCE verifier and state with 10-minute TTL
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pkceStore.set(codeChallenge, { codeVerifier, expiresAt });
    stateStore.set(state, { expiresAt });

    // Build Cognito authorization URL
    const region = process.env.COGNITO_REGION!;
    const clientId = process.env.COGNITO_APP_CLIENT_ID!;
    const redirectUri = process.env.OAUTH_REDIRECT_URI!;
    const domain = process.env.COGNITO_DOMAIN!;

    const authUrl = new URL(
      `https://${domain}.auth.${region}.amazoncognito.com/oauth2/authorize`
    );
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Login initiation error:", error);
    throw new AppError(500, "Failed to initiate login");
  }
});

/**
 * GET /auth/callback
 * Handles Cognito OAuth callback
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, error_description);
      throw new AppError(
        400,
        `Authentication failed: ${error_description || error}`
      );
    }

    if (!code || !state) {
      throw new AppError(400, "Missing authorization code or state");
    }

    // Validate state
    const stateData = stateStore.get(state as string);
    if (!stateData || stateData.expiresAt < Date.now()) {
      throw new AppError(400, "Invalid or expired state parameter");
    }
    stateStore.delete(state as string);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);

    // Verify ID token
    const idToken = await jwtValidationService.verifyIdToken(tokens.id_token);

    // Extract user information
    const userInfo = jwtValidationService.extractUserInfo(idToken);

    // Map Cognito groups to application roles
    const userRoles = roleMappingService.mapGroupsToRoles(userInfo.groups);

    // Upsert user in MongoDB
    await upsertUser(userInfo, userRoles.roles);

    // Create session
    await sessionService.createSession(req, {
      cognitoSub: userInfo.cognitoSub,
      email: userInfo.email,
      name: userInfo.name,
      roles: userRoles.roles,
      groups: userInfo.groups,
    });

    // Redirect to frontend
    const frontendUrl =
      process.env.FRONTEND_ORIGIN ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (error) {
    console.error("Callback error:", error);
    const frontendUrl =
      process.env.FRONTEND_ORIGIN ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    res.redirect(
      `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * POST /auth/logout
 * Logs out user and clears session
 */
router.post("/logout", async (req: Request, res: Response) => {
  try {
    // Destroy local session
    await sessionService.destroySession(req);

    // Optional: Redirect to Cognito global logout
    const region = process.env.COGNITO_REGION!;
    const clientId = process.env.COGNITO_APP_CLIENT_ID!;
    const logoutRedirectUri = process.env.OAUTH_LOGOUT_REDIRECT_URI!;

    const logoutUrl = `https://${process.env.COGNITO_DOMAIN}.auth.${region}.amazoncognito.com/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutRedirectUri)}`;

    res.json({
      status: "success",
      message: "Logged out successfully",
      logoutUrl,
    });
  } catch (error) {
    console.error("Logout error:", error);
    throw new AppError(500, "Failed to logout");
  }
});

/**
 * GET /auth/me
 * Returns current user information
 */
router.get("/me", (req: Request, res: Response) => {
  try {
    const sessionData = sessionService.getSessionData(req);

    if (!sessionData) {
      throw new AppError(401, "Not authenticated");
    }

    res.json({
      status: "success",
      user: {
        id: sessionData.cognitoSub,
        email: sessionData.email,
        name: sessionData.name,
        roles: sessionData.roles,
        groups: sessionData.groups,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    throw new AppError(401, "Not authenticated");
  }
});

/**
 * POST /auth/forgot-password
 * Initiates password reset flow
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { username } = forgotPasswordSchema.parse(req.body);

    // Call Cognito service to initiate password reset
    await cognitoService.initiateForgotPassword(username);

    res.json({
      status: "success",
      message:
        "If an account exists with this email, a password reset code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, "Invalid input data");
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "Failed to process password reset request");
  }
});

/**
 * POST /auth/confirm-forgot-password
 * Confirms password reset with code
 */
router.post("/confirm-forgot-password", async (req: Request, res: Response) => {
  try {
    const { username, code, newPassword } = confirmForgotPasswordSchema.parse(
      req.body
    );

    // Validate password locally first
    const passwordValidation = cognitoService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(
        400,
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    // Call Cognito service to confirm password reset
    await cognitoService.confirmForgotPassword(username, code, newPassword);

    res.json({
      status: "success",
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("Confirm forgot password error:", error);
    if (error instanceof z.ZodError) {
      throw new AppError(400, "Invalid input data");
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "Failed to reset password");
  }
});

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  refresh_token: string;
}> {
  const region = process.env.COGNITO_REGION!;
  const clientId = process.env.COGNITO_APP_CLIENT_ID!;
  const redirectUri = process.env.OAUTH_REDIRECT_URI!;

  const tokenUrl = `https://${process.env.COGNITO_DOMAIN}.auth.${region}.amazoncognito.com/oauth2/token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: code as string,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token exchange error:", errorText);
    throw new AppError(400, "Failed to exchange code for tokens");
  }

  return await response.json();
}

/**
 * Upsert user in MongoDB
 */
async function upsertUser(
  userInfo: {
    cognitoSub: string;
    email: string;
    name?: string;
    picture?: string;
    groups: string[];
  },
  roles: string[]
): Promise<any> {
  try {
    // Find existing user by cognitoSub or email
    let user = await User.findOne({
      $or: [{ cognitoSub: userInfo.cognitoSub }, { email: userInfo.email }],
    });

    if (user) {
      // Update existing user
      user.cognitoSub = userInfo.cognitoSub;
      user.email = userInfo.email;
      user.name = userInfo.name || user.name;
      user.roles = roles;
      user.cognitoGroups = userInfo.groups;
      user.lastLogin = new Date();

      // Update legacy role field for backward compatibility
      user.role = (roles[0] as "owner" | "admin" | "user" | "viewer") || "user";

      await user.save();
    } else {
      // Create new user
      user = await User.create({
        cognitoSub: userInfo.cognitoSub,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split("@")[0],
        roles,
        cognitoGroups: userInfo.groups,
        role: roles[0] || "user", // Legacy field
        status: "active",
        lastLogin: new Date(),
      });

      // Create free tier subscription for new users
      try {
        await SubscriptionService.createFreeTierSubscription(
          user._id.toString()
        );
      } catch (subscriptionError) {
        console.error(
          "Error creating subscription for new user:",
          subscriptionError
        );
        // Don't fail the login if subscription creation fails
      }
    }

    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw new AppError(500, "Failed to create or update user");
  }
}

export const cognitoAuthRoutes = router;
