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
    this.config.COGNITO_APP_CLIENT_SECRET =
      process.env.COGNITO_APP_CLIENT_SECRET;

    // OAuth configuration
    this.config.OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;
    this.config.OAUTH_LOGOUT_REDIRECT_URI =
      process.env.OAUTH_LOGOUT_REDIRECT_URI;
    this.config.AUTH_CALLBACK_URL = process.env.AUTH_CALLBACK_URL;
    this.config.LOGOUT_REDIRECT_URL = process.env.LOGOUT_REDIRECT_URL;

    // Session configuration
    this.config.SESSION_SECRET = process.env.SESSION_SECRET;
    this.config.SESSION_TTL_SECONDS = parseInt(
      process.env.SESSION_TTL_SECONDS || "28800"
    );
    this.config.COOKIE_NAME = process.env.COOKIE_NAME || "aeo_session";

    // Redis configuration
    this.config.REDIS_URL =
      process.env.REDIS_URL || "redis://aeo-redis-prod:6379/0";

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
      "COGNITO_REGION",
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

    // Validate callback URL format
    if (
      this.config.OAUTH_REDIRECT_URI &&
      !this.isValidUrl(this.config.OAUTH_REDIRECT_URI)
    ) {
      throw new Error("OAUTH_REDIRECT_URI must be a valid URL");
    }

    // Validate Cognito domain format
    if (
      this.config.COGNITO_DOMAIN &&
      !this.config.COGNITO_DOMAIN.includes(".")
    ) {
      throw new Error(
        "COGNITO_DOMAIN must be a valid domain (e.g., xxxx.auth.us-east-1.amazoncognito.com)"
      );
    }

    // Validate User Pool ID format (should start with region)
    if (
      this.config.COGNITO_USER_POOL_ID &&
      !this.config.COGNITO_USER_POOL_ID.startsWith(this.config.COGNITO_REGION)
    ) {
      console.warn(
        `⚠️  User Pool ID "${this.config.COGNITO_USER_POOL_ID}" doesn't start with region "${this.config.COGNITO_REGION}"`
      );
    }

    // Validate region format
    if (
      this.config.COGNITO_REGION &&
      !/^[a-z0-9-]+$/.test(this.config.COGNITO_REGION)
    ) {
      throw new Error("COGNITO_REGION must be a valid AWS region format");
    }

    // Log configuration for debugging (non-sensitive)
    console.log("📋 Cognito Configuration:");
    console.log(`   Region: ${this.config.COGNITO_REGION}`);
    console.log(`   Domain: ${this.config.COGNITO_DOMAIN}`);
    console.log(
      `   User Pool ID: ${this.config.COGNITO_USER_POOL_ID?.substring(0, 20)}...`
    );
    console.log(
      `   App Client ID: ${this.config.COGNITO_APP_CLIENT_ID?.substring(0, 20)}...`
    );

    // Log client type for debugging
    if (this.config.COGNITO_APP_CLIENT_SECRET) {
      console.log("🔐 Using confidential client (with secret)");
    } else {
      console.log("🔓 Using public client (no secret)");
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
      "https://themoda.io",
      "http://localhost:3000",
      "http://localhost:3001",
    ].filter(Boolean);

    return [...new Set(origins)]; // Remove duplicates
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Cognito well-known endpoints
   */
  getCognitoEndpoints(): {
    authorization: string;
    token: string;
    logout: string;
    jwks: string;
  } {
    const domain = this.config.COGNITO_DOMAIN;
    const region = this.config.COGNITO_REGION;
    const userPoolId = this.config.COGNITO_USER_POOL_ID;

    if (!domain || !region || !userPoolId) {
      throw new Error("Missing required Cognito configuration for endpoints");
    }

    // Handle both cases: domain with or without https:// prefix
    let cleanDomain = domain;
    if (domain.startsWith("https://")) {
      cleanDomain = domain.replace("https://", "");
    }

    // Validate User Pool ID format - it should start with region
    if (!userPoolId.startsWith(region)) {
      console.warn(
        `⚠️  User Pool ID "${userPoolId}" doesn't start with region "${region}" - this may cause JWKS endpoint issues`
      );
    }

    // Construct JWKS endpoint - ensure proper format
    const jwksEndpoint = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

    // Ensure the domain doesn't have double slashes or protocol issues
    const baseUrl = `https://${cleanDomain}`;

    return {
      authorization: `${baseUrl}/login`,
      token: `${baseUrl}/oauth2/token`,
      logout: `${baseUrl}/logout`,
      jwks: jwksEndpoint,
    };
  }

  /**
   * Get configuration summary for startup logging (non-sensitive)
   */
  getConfigSummary(): any {
    const endpoints = this.getCognitoEndpoints();
    return {
      authProvider: this.config.AUTH_PROVIDER,
      cognitoRegion: this.config.COGNITO_REGION,
      cognitoDomain: this.config.COGNITO_DOMAIN,
      clientType: this.config.COGNITO_APP_CLIENT_SECRET
        ? "confidential"
        : "public",
      hasClientSecret: !!this.config.COGNITO_APP_CLIENT_SECRET,
      hasSessionSecret: !!this.config.SESSION_SECRET,
      sessionTtlSeconds: this.config.SESSION_TTL_SECONDS,
      cookieName: this.config.COOKIE_NAME,
      endpoints: {
        authorization: endpoints.authorization,
        token: endpoints.token,
        logout: endpoints.logout,
        jwks: endpoints.jwks,
      },
      allowedOrigins: this.getAllowedOrigins(),
    };
  }
}

export const configService = new ConfigService();
