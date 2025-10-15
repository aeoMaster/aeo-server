import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { Session } from "../models";

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

// MongoDB Session Store
class MongoSessionStore extends session.Store {
  constructor() {
    super();
    console.log("🗄️ MongoSessionStore constructor called");
  }

  async get(
    sessionId: string,
    callback: (err: any, session?: session.SessionData | null) => void
  ) {
    try {
      const doc = await Session.findById(sessionId);
      if (doc) {
        callback(null, doc.session);
      } else {
        callback(null, null);
      }
    } catch (error) {
      console.error("MongoSessionStore get error:", error);
      callback(error);
    }
  }

  async set(
    sessionId: string,
    session: session.SessionData,
    callback?: (err?: any) => void
  ) {
    try {
      await Session.findByIdAndUpdate(
        sessionId,
        {
          session,
          expires: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        },
        { upsert: true }
      );
      callback?.();
    } catch (error) {
      console.error("MongoSessionStore set error:", error);
      callback?.(error);
    }
  }

  async destroy(sessionId: string, callback?: (err?: any) => void) {
    try {
      await Session.findByIdAndDelete(sessionId);
      callback?.();
    } catch (error) {
      console.error("MongoSessionStore destroy error:", error);
      callback?.(error);
    }
  }
}

class SessionService {
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

  private initializeStore(): void {
    // Use MongoDB session store for all environments - NO FALLBACK
    console.log("🗄️ Initializing MongoDB session store...");
    this.store = new MongoSessionStore();
    console.log("🗄️ Session store initialized with MongoDB");
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
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    // MongoDB connections are handled by mongoose
    console.log("🗄️ MongoDB session store connection cleanup completed");
  }
}

export const sessionService = new SessionService();
