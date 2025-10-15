/**
 * OAuth State Storage Service
 *
 * Provides a unified interface for storing OAuth state and PKCE parameters.
 * Supports both in-memory storage (development/single instance) and Redis (production/multi-instance).
 *
 * This service is essential for OAuth flows in distributed deployments where state
 * must be shared across multiple application instances.
 */

import { configService } from "./configService";

export interface IPkceData {
  codeVerifier: string;
  expiresAt: number;
}

export interface IStateData {
  expiresAt: number;
}

export interface IOAuthStateService {
  setPkce(codeChallenge: string, data: IPkceData): Promise<void>;
  getPkce(codeChallenge: string): Promise<IPkceData | undefined>;
  deletePkce(codeChallenge: string): Promise<void>;
  setState(state: string, data: IStateData): Promise<void>;
  getState(state: string): Promise<IStateData | undefined>;
  deleteState(state: string): Promise<void>;
  cleanup(): void;
}

/**
 * In-Memory Storage Implementation
 * Use for development or single-instance deployments
 */
class InMemoryOAuthStateService implements IOAuthStateService {
  private pkceStore = new Map<string, IPkceData>();
  private stateStore = new Map<string, IStateData>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpired();
      },
      5 * 60 * 1000
    );
  }

  private cleanupExpired(): void {
    const now = Date.now();

    // Clean PKCE store
    for (const [key, value] of this.pkceStore.entries()) {
      if (value.expiresAt < now) {
        this.pkceStore.delete(key);
      }
    }

    // Clean state store
    for (const [key, value] of this.stateStore.entries()) {
      if (value.expiresAt < now) {
        this.stateStore.delete(key);
      }
    }
  }

  async setPkce(codeChallenge: string, data: IPkceData): Promise<void> {
    this.pkceStore.set(codeChallenge, data);
  }

  async getPkce(codeChallenge: string): Promise<IPkceData | undefined> {
    return this.pkceStore.get(codeChallenge);
  }

  async deletePkce(codeChallenge: string): Promise<void> {
    this.pkceStore.delete(codeChallenge);
  }

  async setState(state: string, data: IStateData): Promise<void> {
    this.stateStore.set(state, data);
  }

  async getState(state: string): Promise<IStateData | undefined> {
    return this.stateStore.get(state);
  }

  async deleteState(state: string): Promise<void> {
    this.stateStore.delete(state);
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Redis Storage Implementation
 * Use for production multi-instance deployments
 */
class RedisOAuthStateService implements IOAuthStateService {
  private redisClient: any; // Type will be from redis package
  private readonly TTL_SECONDS = 600; // 10 minutes

  constructor(redisUrl: string) {
    // Dynamic import to avoid requiring Redis in all environments
    this.initRedis(redisUrl);
  }

  private async initRedis(redisUrl: string): Promise<void> {
    try {
      const redis = await import("redis");
      this.redisClient = redis.createClient({ url: redisUrl });

      this.redisClient.on("error", (err: Error) => {
        console.error("Redis connection error:", err);
      });

      await this.redisClient.connect();
      console.log("✅ Redis connected for OAuth state management");
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      throw new Error("Redis initialization failed");
    }
  }

  async setPkce(codeChallenge: string, data: IPkceData): Promise<void> {
    const key = `oauth:pkce:${codeChallenge}`;
    await this.redisClient.set(key, JSON.stringify(data), {
      EX: this.TTL_SECONDS,
    });
  }

  async getPkce(codeChallenge: string): Promise<IPkceData | undefined> {
    const key = `oauth:pkce:${codeChallenge}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : undefined;
  }

  async deletePkce(codeChallenge: string): Promise<void> {
    const key = `oauth:pkce:${codeChallenge}`;
    await this.redisClient.del(key);
  }

  async setState(state: string, data: IStateData): Promise<void> {
    const key = `oauth:state:${state}`;
    await this.redisClient.set(key, JSON.stringify(data), {
      EX: this.TTL_SECONDS,
    });
  }

  async getState(state: string): Promise<IStateData | undefined> {
    const key = `oauth:state:${state}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : undefined;
  }

  async deleteState(state: string): Promise<void> {
    const key = `oauth:state:${state}`;
    await this.redisClient.del(key);
  }

  cleanup(): void {
    if (this.redisClient) {
      this.redisClient.quit();
    }
  }
}

/**
 * Factory function to create the appropriate OAuth state service based on configuration
 */
function createOAuthStateService(): IOAuthStateService {
  const redisUrl = configService.get("REDIS_URL");

  if (redisUrl && process.env.NODE_ENV === "production") {
    console.log("Using Redis for OAuth state management (multi-instance safe)");
    return new RedisOAuthStateService(redisUrl);
  } else {
    console.log(
      "⚠️  Using in-memory OAuth state management (single instance only)"
    );
    return new InMemoryOAuthStateService();
  }
}

// Export singleton instance
export const oauthStateService = createOAuthStateService();

// Cleanup on process exit
process.on("SIGTERM", () => {
  oauthStateService.cleanup();
});

process.on("SIGINT", () => {
  oauthStateService.cleanup();
});
