import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import { jwtValidationService } from "../services/jwtValidationService";
import { roleMappingService } from "../services/roleMappingService";
import { cognitoService } from "../services/cognitoService";
import { configService } from "../services/configService";
import { User } from "../models/User";
import { SubscriptionService } from "../services/subscriptionService";
import { oauthStateService } from "../services/oauthStateService";

const router = Router();

// Helper function for structured error messages
function getStructuredErrorMessage(
  error: string,
  errorDescription?: string
): string {
  const errorMap: { [key: string]: string } = {
    access_denied: "User denied access to the application",
    invalid_request: "Invalid authentication request",
    invalid_client: "Invalid client configuration",
    invalid_grant: "Invalid authorization grant",
    invalid_scope: "Invalid scope requested",
    server_error: "Authentication server error",
    temporarily_unavailable: "Authentication service temporarily unavailable",
  };

  return (
    errorMap[error] || errorDescription || `Authentication failed: ${error}`
  );
}

// Validation schemas
const forgotPasswordSchema = z.object({
  username: z.string().email("Invalid email address"),
});

const confirmForgotPasswordSchema = z.object({
  username: z.string().email("Invalid email address"),
  code: z.string().min(1, "Code is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

// OAuth state and PKCE storage is now handled by oauthStateService
// This service automatically uses Redis in production for multi-instance deployments

/**
 * GET /api/auth/login
 * Builds and redirects to the Hosted UI login URL with proper validation
 */
router.get("/login", async (_req: Request, res: Response) => {
  try {
    // Validate required configuration
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

    // Validate redirect URI format
    const redirectUri = configService.get("OAUTH_REDIRECT_URI");
    if (!redirectUri || !redirectUri.startsWith("http")) {
      throw new AppError(500, "OAUTH_REDIRECT_URI must be a valid URL");
    }

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
    await oauthStateService.setPkce(codeChallenge, { codeVerifier, expiresAt });
    await oauthStateService.setState(state, { expiresAt });

    // Build Cognito authorization URL using well-known endpoints
    const endpoints = configService.getCognitoEndpoints();
    const clientId = configService.get("COGNITO_APP_CLIENT_ID");

    const authUrl = new URL(`${endpoints.authorization}/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    console.log(`Redirecting to Cognito Hosted UI: ${authUrl.toString()}`);
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Login initiation error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "Failed to initiate login");
  }
});

/**
 * GET /api/auth/callback
 * Handles Cognito OAuth callback with comprehensive validation
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    console.log("code", code);
    console.log("state", state);
    console.log("error", error);
    console.log("error_description", error_description);

    // Handle OAuth errors with structured responses
    if (error) {
      console.error("OAuth error:", error, error_description);
      const errorMessage = getStructuredErrorMessage(
        error as string,
        error_description as string
      );
      throw new AppError(400, errorMessage);
    }

    // Validate presence of code and state
    if (!code || !state) {
      throw new AppError(400, "Missing authorization code or state parameter");
    }

    // Validate state parameter for CSRF protection
    const stateData = await oauthStateService.getState(state as string);
    if (!stateData || stateData.expiresAt < Date.now()) {
      throw new AppError(400, "Invalid or expired state parameter");
    }
    await oauthStateService.deleteState(state as string);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);
    console.log("tokens", tokens);

    // Verify ID token signature via JWKS
    const idToken = await jwtValidationService.verifyIdToken(tokens.id_token);
    console.log("idToken", idToken);
    // Extract user information from ID token
    const userInfo = jwtValidationService.extractUserInfo(idToken);
    console.log("userInfo", userInfo);
    // Map Cognito groups to application roles
    const userRoles = roleMappingService.mapGroupsToRoles(userInfo.groups);
    console.log("userRoles", userRoles);

    // Upsert user in database (idempotent operation)
    // This handles both signup (creates user + subscription) and login (updates user info)
    const user = await upsertUser(userInfo, userRoles.roles);

    // Generate JWT token (matching traditional auth behavior)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    // Frontend will extract token from URL and store it (localStorage/sessionStorage)
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") ||
      configService.get("CLIENT_URL") ||
      "https://www.themoda.io";
    console.log("frontendUrl", frontendUrl);
    console.log("Generated JWT token for user:", user._id);

    // Redirect to auth callback page with token
    res.redirect(
      `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: user._id,
          name: user.name,
          email: user.email,
          roles: userRoles.roles,
        })
      )}`
    );
  } catch (error) {
    console.error("Callback error:", error);
    const frontendUrl =
      configService.get("FRONTEND_ORIGIN") ||
      configService.get("CLIENT_URL") ||
      "https://www.themoda.io";
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";
    res.redirect(
      `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`
    );
  }
});

/**
 * POST /api/auth/logout
 * Returns Cognito logout URL (JWT is stateless, so just clear on client side)
 */
router.post("/logout", async (_req: Request, res: Response) => {
  try {
    // Build Cognito logout URL using well-known endpoints
    const endpoints = configService.getCognitoEndpoints();
    const clientId = configService.get("COGNITO_APP_CLIENT_ID");
    const logoutRedirectUri =
      configService.get("OAUTH_LOGOUT_REDIRECT_URI") ||
      configService.get("LOGOUT_REDIRECT_URL") ||
      configService.get("FRONTEND_ORIGIN") ||
      configService.get("CLIENT_URL");

    if (!logoutRedirectUri) {
      throw new AppError(500, "Missing logout redirect URL configuration");
    }

    const logoutUrl = `${endpoints.logout}?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutRedirectUri)}`;

    res.json({
      status: "success",
      message:
        "Logged out successfully. Please clear your JWT token on the client side.",
      logoutUrl,
    });
  } catch (error) {
    console.error("Logout error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "Failed to logout");
  }
});

/**
 * GET /auth/me
 * Returns current user information from JWT token
 */
router.get("/me", (req: Request, res: Response, next: NextFunction) => {
  // Use JWT authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Not authenticated");
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // Get user from database
    User.findById(decoded.id)
      .then((user) => {
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
      })
      .catch((error) => {
        console.error("Get user error:", error);
        next(new AppError(401, "Not authenticated"));
      });
  } catch (error) {
    console.error("JWT verification error:", error);
    throw new AppError(401, "Invalid token");
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
 * Exchange authorization code for tokens using Cognito token endpoint
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

  try {
    const response = await fetch(endpoints.token, {
      method: "POST",
      headers,
      body: params,
    });

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

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Network error during token exchange:", error);
    throw new AppError(500, "Network error during authentication");
  }
}

/**
 * Upsert user in MongoDB
 * For new users: Creates user AND subscription atomically (fails if subscription fails)
 * For existing users: Updates user info and refreshes subscription if needed
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
      console.log(`Updating existing user: ${user._id}`);
      user.cognitoSub = userInfo.cognitoSub;
      user.email = userInfo.email;
      user.name = userInfo.name || user.name;
      user.roles = roles;
      user.cognitoGroups = userInfo.groups;
      user.lastLogin = new Date();

      // Update legacy role field for backward compatibility
      user.role = (roles[0] as "owner" | "admin" | "user" | "viewer") || "user";

      await user.save();
      console.log(`Successfully updated user: ${user._id}`);
    } else {
      // Create new user
      console.log(`Creating new user for Cognito sub: ${userInfo.cognitoSub}`);

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
      console.log(`Successfully created user: ${user._id}`);

      // Create free tier subscription for new users
      // This is CRITICAL - if this fails, we delete the user and fail the login
      // This matches the behavior of traditional signup (see auth.ts lines 50-61)
      try {
        console.log(`Creating free tier subscription for user: ${user._id}`);
        await SubscriptionService.createFreeTierSubscription(
          user._id.toString()
        );
        console.log(`Successfully created subscription for user: ${user._id}`);
      } catch (subscriptionError) {
        console.error(
          "CRITICAL: Failed to create subscription for new user:",
          subscriptionError
        );
        // Delete the user if subscription creation fails
        // This ensures data consistency - no users without subscriptions
        console.log(`Rolling back user creation: ${user._id}`);
        await User.findByIdAndDelete(user._id);
        throw new AppError(
          500,
          "Failed to create user subscription. Please try again."
        );
      }
    }

    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "Failed to create or update user");
  }
}

export const cognitoAuthRoutes = router;
