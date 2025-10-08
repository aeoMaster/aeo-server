/**
 * Configuration service for managing environment variables and feature flags
 */
class ConfigService {
  private config: { [key: string]: any } = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // Authentication provider configuration
    this.config.AUTH_PROVIDER = process.env.AUTH_PROVIDER || "cognito";

    // Cognito configuration
    this.config.COGNITO_REGION = process.env.COGNITO_REGION || "us-east-1";
    this.config.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    this.config.COGNITO_APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
    this.config.COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;

    // OAuth configuration
    this.config.OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
    this.config.OAUTH_LOGOUT_REDIRECT_URI =
      process.env.OAUTH_LOGOUT_REDIRECT_URI;

    // Session configuration
    this.config.SESSION_SECRET = process.env.SESSION_SECRET;
    this.config.SESSION_TTL_SECONDS = parseInt(
      process.env.SESSION_TTL_SECONDS || "28800"
    );
    this.config.COOKIE_NAME = process.env.COOKIE_NAME || "aeo_session";

    // Redis configuration
    this.config.REDIS_URL = process.env.REDIS_URL;

    // Frontend configuration
    this.config.FRONTEND_ORIGIN =
      process.env.FRONTEND_ORIGIN || process.env.CLIENT_URL;

    // JWT configuration (for legacy auth)
    this.config.JWT_SECRET = process.env.JWT_SECRET;
    this.config.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

    // Google OAuth configuration (for legacy auth)
    this.config.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    this.config.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  }

  /**
   * Get a configuration value
   */
  get(key: string): any {
    return this.config[key];
  }

  /**
   * Check if authentication provider is Cognito
   */
  isCognitoAuth(): boolean {
    return this.config.AUTH_PROVIDER === "cognito";
  }

  /**
   * Check if authentication provider is legacy
   */
  isLegacyAuth(): boolean {
    return this.config.AUTH_PROVIDER === "legacy";
  }

  /**
   * Validate required Cognito configuration
   */
  validateCognitoConfig(): void {
    const required = [
      "COGNITO_USER_POOL_ID",
      "COGNITO_APP_CLIENT_ID",
      "COGNITO_DOMAIN",
      "OAUTH_REDIRECT_URI",
      "SESSION_SECRET",
    ];

    const missing = required.filter((key) => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required Cognito configuration: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Validate required legacy configuration
   */
  validateLegacyConfig(): void {
    const required = ["JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

    const missing = required.filter((key) => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required legacy configuration: ${missing.join(", ")}`
      );
    }
  }

  /**
   * Get all configuration (for debugging)
   */
  getAllConfig(): { [key: string]: any } {
    // Return config without sensitive values
    const safeConfig = { ...this.config };
    const sensitiveKeys = [
      "SESSION_SECRET",
      "JWT_SECRET",
      "GOOGLE_CLIENT_SECRET",
    ];

    sensitiveKeys.forEach((key) => {
      if (safeConfig[key]) {
        safeConfig[key] = "[REDACTED]";
      }
    });

    return safeConfig;
  }

  /**
   * Check if we're in development mode
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Check if we're in production mode
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Get CORS allowed origins
   */
  getAllowedOrigins(): string[] {
    const origins = [
      this.config.FRONTEND_ORIGIN,
      "http://localhost:3000",
      "http://localhost:3001",
    ].filter(Boolean);

    return [...new Set(origins)]; // Remove duplicates
  }
}

export const configService = new ConfigService();
