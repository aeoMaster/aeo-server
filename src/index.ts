import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import { errorHandler } from "./middleware/errorHandler";
import { initializePassport } from "./config/passport";
import { seedPackages } from "./config/seedPackages";
import { authRoutes } from "./routes/auth";
import { cognitoAuthRoutes } from "./routes/cognitoAuth";
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
} from "./middleware/security";

// Load environment variables FIRST
dotenv.config();

const app: Express = express();

// Initialize configuration
try {
  if (configService.isCognitoAuth()) {
    configService.validateCognitoConfig();
    console.log("Cognito authentication enabled");
  } else {
    configService.validateLegacyConfig();
    console.log("Legacy authentication enabled");
  }
} catch (error) {
  console.error("Configuration validation failed:", error);
  process.exit(1);
}

// Security middleware (order matters!)
app.use(requestId);
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
  app.use("/api/auth", cognitoAuthRoutes);
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
app.use("/health", healthRoutes);

// Error handling
app.use(sanitizeErrors);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
