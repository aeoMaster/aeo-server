/**
 * OAuth State Storage Service
 *
 * Provides a unified interface for storing OAuth state and PKCE parameters.
 * Uses MongoDB for persistent storage across all instances.
 *
 * This service is essential for OAuth flows in distributed deployments where state
 * must be shared across multiple application instances.
 */

import { OAuthState } from "../models";

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
 * MongoDB Storage Implementation
 * Uses MongoDB for persistent OAuth state storage across all instances
 */
class MongoOAuthStateService implements IOAuthStateService {
  constructor() {
    console.log(
      "🗄️ [MongoDB] OAuth state service initialized with MongoDB storage"
    );
  }

  private async upsertState(
    key: string,
    data: any,
    expiresAt: number
  ): Promise<void> {
    try {
      await OAuthState.findOneAndUpdate(
        { key },
        {
          key,
          data,
          expiresAt: new Date(expiresAt),
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error("MongoDB OAuth state upsert error:", error);
      throw error;
    }
  }

  private async getStateData(key: string): Promise<any> {
    try {
      const doc = await OAuthState.findOne({ key });
      return doc ? doc.data : undefined;
    } catch (error) {
      console.error("MongoDB OAuth state get error:", error);
      throw error;
    }
  }

  private async deleteStateData(key: string): Promise<void> {
    try {
      await OAuthState.deleteOne({ key });
    } catch (error) {
      console.error("MongoDB OAuth state delete error:", error);
      throw error;
    }
  }

  async setPkce(codeChallenge: string, data: IPkceData): Promise<void> {
    const key = `pkce:${codeChallenge}`;
    console.log(
      `🔒 [MongoDB] Setting PKCE: ${codeChallenge.substring(0, 8)}... (expires: ${new Date(data.expiresAt).toISOString()})`
    );
    await this.upsertState(key, data, data.expiresAt);
    console.log(`🔒 [MongoDB] PKCE stored in MongoDB`);
  }

  async getPkce(codeChallenge: string): Promise<IPkceData | undefined> {
    const key = `pkce:${codeChallenge}`;
    console.log(
      `🔍 [MongoDB] Getting PKCE: ${codeChallenge.substring(0, 8)}...`
    );
    const result = await this.getStateData(key);
    console.log(
      `🔍 [MongoDB] PKCE ${codeChallenge.substring(0, 8)}... ${result ? "FOUND" : "NOT FOUND"}`
    );
    return result;
  }

  async deletePkce(codeChallenge: string): Promise<void> {
    const key = `pkce:${codeChallenge}`;
    console.log(
      `🗑️ [MongoDB] Deleting PKCE: ${codeChallenge.substring(0, 8)}...`
    );
    await this.deleteStateData(key);
    console.log(`🗑️ [MongoDB] PKCE deleted from MongoDB`);
  }

  async setState(state: string, data: IStateData): Promise<void> {
    const key = `state:${state}`;
    console.log(
      `🔒 [MongoDB] Setting state: ${state.substring(0, 8)}... (expires: ${new Date(data.expiresAt).toISOString()})`
    );
    await this.upsertState(key, data, data.expiresAt);
    console.log(`🔒 [MongoDB] State stored in MongoDB`);
  }

  async getState(state: string): Promise<IStateData | undefined> {
    const key = `state:${state}`;
    console.log(`🔍 [MongoDB] Getting state: ${state.substring(0, 8)}...`);
    const result = await this.getStateData(key);
    console.log(
      `🔍 [MongoDB] State ${state.substring(0, 8)}... ${result ? "FOUND" : "NOT FOUND"}`
    );
    if (result) {
      console.log(
        `🔍 [MongoDB] State expires: ${new Date(result.expiresAt).toISOString()}, now: ${new Date().toISOString()}`
      );
    }
    return result;
  }

  async deleteState(state: string): Promise<void> {
    const key = `state:${state}`;
    console.log(`🗑️ [MongoDB] Deleting state: ${state.substring(0, 8)}...`);
    await this.deleteStateData(key);
    console.log(`🗑️ [MongoDB] State deleted from MongoDB`);
  }

  cleanup(): void {
    // MongoDB TTL index handles cleanup automatically
    console.log(
      "🗄️ [MongoDB] Cleanup not needed - MongoDB TTL handles expiration"
    );
  }
}

/**
 * Factory function to create the OAuth state service
 * Always uses MongoDB for consistent storage across all environments
 */
function createOAuthStateService(): IOAuthStateService {
  console.log(
    "🗄️ Using MongoDB for OAuth state management (multi-instance safe)"
  );
  return new MongoOAuthStateService();
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
