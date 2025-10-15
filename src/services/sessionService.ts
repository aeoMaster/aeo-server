import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";

export interface ISessionData {
  sessionId: string;
  userId: string;
  cognitoSub: string;
  email: string;
  name?: string;
  roles: string[];
  groups: string[];
  createdAt: Date;
  lastAccessedAt: Date;
}

class SessionService {
  private redisClient?: any;
  private store!: session.Store;
  private sessionSecret: string;
  private sessionTtl: number;

  constructor() {
    this.sessionSecret = process.env.SESSION_SECRET!;
    this.sessionTtl = parseInt(process.env.SESSION_TTL_SECONDS || "28800"); // 8 hours

    if (!this.sessionSecret) {
      throw new Error("SESSION_SECRET is required");
    }

    this.initializeStore();
  }

  private async initializeStore(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || "redis://aeo-redis-prod:6379";

    if (redisUrl && process.env.NODE_ENV === "production") {
      // Use Redis in production
      try {
        this.redisClient = createClient({
          url: redisUrl,
          socket: {
            reconnectStrategy: (retries) => Math.min(retries * 50, 500),
          },
        });

        this.redisClient.on("error", (err: Error) => {
          console.error("Redis Client Error:", err);
        });

        await this.redisClient.connect();

        // Use new RedisStore API (no session wrapper)
        this.store = new RedisStore({
          client: this.redisClient,
          prefix: "aeo:session:",
        });

        console.log("Session store initialized with Redis");
      } catch (error) {
        console.error(
          "Failed to initialize Redis store, falling back to memory store:",
          error
        );
        this.initializeMemoryStore();
      }
    } else {
      // Use memory store in development
      this.initializeMemoryStore();
    }
  }

  private initializeMemoryStore(): void {
    const MemoryStore = require("memorystore")(session);
    this.store = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    console.log("Session store initialized with memory store");
  }

  /**
   * Get session configuration for Express
   */
  getSessionConfig(): session.SessionOptions {
    return {
      store: this.store,
      secret: this.sessionSecret,
      name: process.env.COOKIE_NAME || "aeo_session",
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset expiration on each request
      proxy: true, // Trust proxy for accurate IP detection
      cookie: {
        secure: process.env.NODE_ENV === "production", // HTTPS in production
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict", // Lax for production cross-site
        maxAge: this.sessionTtl * 1000, // Convert to milliseconds
        domain: process.env.COOKIE_DOMAIN || undefined, // Set domain for multi-container consistency
      },
      genid: () => uuidv4(),
    };
  }

  /**
   * Create a new session
   */
  async createSession(
    req: any,
    userData: {
      cognitoSub: string;
      email: string;
      name?: string;
      roles: string[];
      groups: string[];
    }
  ): Promise<string> {
    const sessionId = uuidv4();
    const now = new Date();

    const sessionData: ISessionData = {
      sessionId,
      userId: userData.cognitoSub,
      cognitoSub: userData.cognitoSub,
      email: userData.email,
      name: userData.name,
      roles: userData.roles,
      groups: userData.groups,
      createdAt: now,
      lastAccessedAt: now,
    };

    // Store session data
    req.session.sessionId = sessionId;
    req.session.userData = sessionData;

    return sessionId;
  }

  /**
   * Get session data
   */
  getSessionData(req: any): ISessionData | null {
    if (!req.session || !req.session.userData) {
      return null;
    }

    // Update last accessed time
    req.session.userData.lastAccessedAt = new Date();
    return req.session.userData;
  }

  /**
   * Destroy session
   */
  async destroySession(req: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.destroy((err: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(req: any): boolean {
    return !!(req.session && req.session.userData);
  }

  /**
   * Get user roles from session
   */
  getUserRoles(req: any): string[] {
    const sessionData = this.getSessionData(req);
    return sessionData?.roles || [];
  }

  /**
   * Check if user has required role
   */
  hasRole(req: any, requiredRole: string): boolean {
    const userRoles = this.getUserRoles(req);
    return userRoles.includes(requiredRole);
  }

  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(req: any, requiredRoles: string[]): boolean {
    const userRoles = this.getUserRoles(req);
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

export const sessionService = new SessionService();
