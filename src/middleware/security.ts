import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { AppError } from "./errorHandler";

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

/**
 * HTTPS enforcement middleware for production
 */
export const enforceHttps = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Allow health check endpoints from localhost/loopback
  const isLocalhost =
    req.ip === "127.0.0.1" ||
    req.ip === "::1" ||
    req.ip === "::ffff:127.0.0.1" ||
    req.connection?.remoteAddress === "127.0.0.1" ||
    req.connection?.remoteAddress === "::1";

  const isHealthCheck =
    req.path === "/health" || req.path.startsWith("/health/");

  if (isLocalhost && isHealthCheck) {
    return next();
  }

  // Check for HTTPS in various proxy scenarios
  const isHttps =
    req.secure ||
    req.headers["x-forwarded-proto"] === "https" ||
    req.headers["x-forwarded-ssl"] === "on";

  if (!isHttps) {
    console.warn(
      `⚠️  Insecure request blocked: ${req.method} ${req.url} from ${req.ip}`
    );
    throw new AppError(400, "HTTPS required in production");
  }

  next();
};

/**
 * CSRF protection middleware
 * For state-changing operations (POST, PUT, PATCH, DELETE)
 */
export const csrfProtection = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for certain endpoints
  const skipPaths = ["/api/auth/callback", "/api/webhooks"];
  if (skipPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Check for CSRF token in header or body
  const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;

  if (!csrfToken) {
    throw new AppError(403, "CSRF token required");
  }

  // In a real implementation, you would validate the CSRF token
  // against the session or a separate CSRF store
  // For now, we'll just check that it exists

  next();
};

/**
 * Rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/api/health";
  },
});

/**
 * Rate limiting for password reset endpoints
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    status: "error",
    message: "Too many password reset attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for API endpoints
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and auth callback
    return (
      req.path === "/health" ||
      req.path === "/api/health" ||
      req.path === "/api/auth/callback"
    );
  },
});

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    const allowedOrigins = [
      process.env.FRONTEND_ORIGIN,
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://localhost:3001",
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 hours
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Log without PII
    if (req.path.startsWith("/api/auth/")) {
      logData.url = req.path; // Don't log query parameters for auth endpoints
    }

    console.log(JSON.stringify(logData));
  });

  next();
};

/**
 * Error sanitization middleware
 */
export const sanitizeErrors = (
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Don't leak internal errors in production
  if (process.env.NODE_ENV === "production") {
    if (err.statusCode >= 500) {
      err.message = "Internal server error";
    }
  }

  next(err);
};

/**
 * Request ID middleware for correlation
 */
export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    Math.random().toString(36).substr(2, 9);

  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-ID", id);

  next();
};
