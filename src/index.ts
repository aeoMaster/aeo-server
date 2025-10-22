import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { initializePassport } from "./config/passport";
import { seedPackages } from "./config/seedPackages";
import { authRoutes } from "./routes/auth";
import { cognitoAuthRoutes } from "./routes/cognitoAuth";
import { simplifiedCognitoAuthRoutes } from "./routes/simplifiedCognitoAuth";
import { analyzeRoutes } from "./routes/analyze";
import { settingsRoutes } from "./routes/settings";
import { subscriptionRoutes } from "./routes/subscription";
import { companyRoutes } from "./routes/company";
import { usageRoutes } from "./routes/usage";
import { packageRoutes } from "./routes/package";
import { siteAnalysisRoutes } from "./routes/siteAnalysis";
import { blogRoutes } from "./routes/blog";
import { oauthRoutes } from "./routes/oauth";
import { clarityScannerRoutes } from "./routes/clarityScanner";
import { healthRoutes } from "./routes/health";
import { debugRoutes } from "./routes/debug";
import { sessionService } from "./services/sessionService";
import { configService } from "./services/configService";
import {
  securityHeaders,
  corsOptions,
  authRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  requestLogger,
  sanitizeErrors,
  requestId,
  enforceHttps,
} from "./middleware/security";

// Load environment variables FIRST
dotenv.config();

const app: Express = express();

// Trust proxy for accurate IP detection behind nginx load balancer
app.set("trust proxy", 1);

// Test Cognito connectivity at startup
async function testCognitoConnectivity(endpoints: any) {
  try {
    console.log("🔍 Testing Cognito connectivity...");
    console.log("📋 Testing endpoints:", {
      jwks: endpoints.jwks,
      token: endpoints.token,
      authorization: endpoints.authorization,
    });

    // Test JWKS endpoint with better error handling
    try {
      const jwksController = new AbortController();
      const jwksTimeoutId = setTimeout(() => jwksController.abort(), 10000); // 10 second timeout

      const jwksResponse = await fetch(endpoints.jwks, {
        method: "HEAD",
        signal: jwksController.signal,
      });

      clearTimeout(jwksTimeoutId);

      if (!jwksResponse.ok) {
        console.error(
          `❌ JWKS endpoint returned ${jwksResponse.status}: ${jwksResponse.statusText}`
        );
        console.error(`🔗 JWKS URL: ${endpoints.jwks}`);

        // Don't throw error for 400 - just log warning and continue
        if (jwksResponse.status === 400) {
          console.warn(
            "⚠️  JWKS endpoint returned 400 - this may be due to User Pool configuration"
          );
          console.warn(
            "💡 The application will still work, but JWT validation may be affected"
          );
          console.warn(
            "🔧 Verify your Cognito User Pool ID format and region settings"
          );
        } else {
          throw new Error(
            `JWKS endpoint not reachable: ${jwksResponse.status} - ${jwksResponse.statusText}`
          );
        }
      } else {
        console.log("✅ JWKS endpoint reachable");
      }
    } catch (jwksError) {
      console.error("❌ JWKS endpoint test failed:", jwksError);
      console.log(
        "💡 Check your COGNITO_USER_POOL_ID and COGNITO_REGION environment variables"
      );
      // Don't throw for network errors - just log and continue
      console.warn(
        "⚠️  JWKS connectivity test failed, but application will continue"
      );
    }

    // Test token endpoint
    try {
      const tokenController = new AbortController();
      const tokenTimeoutId = setTimeout(() => tokenController.abort(), 10000); // 10 second timeout

      const tokenResponse = await fetch(endpoints.token, {
        method: "HEAD",
        signal: tokenController.signal,
      });

      clearTimeout(tokenTimeoutId);

      if (!tokenResponse.ok) {
        console.error(
          `❌ Token endpoint returned ${tokenResponse.status}: ${tokenResponse.statusText}`
        );
        console.error(`🔗 Token URL: ${endpoints.token}`);
        throw new Error(
          `Token endpoint not reachable: ${tokenResponse.status} - ${tokenResponse.statusText}`
        );
      }
      console.log("✅ Token endpoint reachable");
    } catch (tokenError) {
      console.error("❌ Token endpoint test failed:", tokenError);
      console.log(
        "💡 Check your COGNITO_DOMAIN and COGNITO_REGION environment variables"
      );
      throw tokenError;
    }

    console.log("✅ Cognito connectivity test passed");
  } catch (error) {
    console.error("⚠️  Cognito connectivity test failed:", error);
    console.log(
      "💡 This may be normal in development. Ensure your Cognito configuration is correct."
    );
    console.log("🔧 Verify these environment variables:");
    console.log("   - COGNITO_REGION");
    console.log("   - COGNITO_USER_POOL_ID");
    console.log("   - COGNITO_DOMAIN");
    console.log("   - COGNITO_APP_CLIENT_ID");
  }
}

// Initialize configuration with comprehensive validation
(async () => {
  try {
    if (configService.isCognitoAuth()) {
      configService.validateCognitoConfig();
      console.log("✅ Cognito authentication enabled");

      // Log configuration summary (non-sensitive)
      const configSummary = configService.getConfigSummary();
      console.log(
        "📋 Configuration Summary:",
        JSON.stringify(configSummary, null, 2)
      );

      // Test Cognito connectivity
      await testCognitoConnectivity(configSummary.endpoints);
    } else {
      configService.validateLegacyConfig();
      console.log("✅ Legacy authentication enabled");
    }
  } catch (error) {
    console.error("❌ Configuration validation failed:", error);
    process.exit(1);
  }
})();

// Security middleware (order matters!)
app.use(requestId);
app.use(enforceHttps);
app.use(securityHeaders);
app.use(requestLogger);
app.use(cors(corsOptions));

// Session middleware (only for Cognito auth)
if (configService.isCognitoAuth()) {
  app.use(session(sessionService.getSessionConfig()));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); // Add cookie parsing for session management

// Cookie debugging middleware (only in development)
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/auth/")) {
      console.log("🍪 Cookie Debug Info:");
      console.log("  RAW Cookie header:", req.headers.cookie);
      console.log("  Parsed cookies:", req.cookies);
      console.log("  aeo_session found:", !!req.cookies?.aeo_session);
      if (req.cookies?.aeo_session) {
        console.log(
          "  aeo_session value:",
          req.cookies.aeo_session.substring(0, 20) + "..."
        );
      }
    }
    next();
  });
}

// Rate limiting
app.use("/api/auth", authRateLimit);
app.use("/api/auth/forgot-password", passwordResetRateLimit);
app.use("/api/auth/confirm-forgot-password", passwordResetRateLimit);
app.use("/api", apiRateLimit);

// Initialize Passport (for legacy auth)
if (configService.isLegacyAuth()) {
  app.use(passport.initialize());
  initializePassport();
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    // Seed packages after successful database connection
    seedPackages();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Routes
app.use("/api/auth", authRoutes);
if (configService.isCognitoAuth()) {
  // Use simplified Cognito auth routes for better reliability
  app.use("/api/auth", simplifiedCognitoAuthRoutes);
  // Keep original routes as backup at different path
  app.use("/api/auth/complex", cognitoAuthRoutes);
}
app.use("/api/analyze", analyzeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/site", siteAnalysisRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/clarity-scan", clarityScannerRoutes);
app.use("/api/debug", debugRoutes);
app.use("/health", healthRoutes);

// Error handling
app.use(sanitizeErrors);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
