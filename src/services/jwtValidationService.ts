import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { AppError } from "../middleware/errorHandler";

export interface ICognitoIdToken {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  "cognito:groups"?: string[];
  aud: string;
  iss: string;
  exp: number;
  nbf: number;
  iat: number;
  token_use: string;
  kid?: string;
}

interface ICognitoAccessToken {
  sub: string;
  token_use: string;
  scope: string;
  auth_time: number;
  iss: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  client_id: string;
  username: string;
}

class JwtValidationService {
  private jwksClient: jwksClient.JwksClient;
  private region: string;
  private userPoolId: string;
  private appClientId: string;

  constructor() {
    this.region = process.env.COGNITO_REGION || "us-east-1";
    this.userPoolId = process.env.COGNITO_USER_POOL_ID!;
    this.appClientId = process.env.COGNITO_APP_CLIENT_ID!;

    console.log("🔐 Cognito configuration:", {
      region: this.region,
      userPoolId: this.userPoolId,
      appClientId: this.appClientId,
    });
    if (!this.userPoolId || !this.appClientId) {
      throw new Error("Missing required Cognito configuration");
    }

    const jwksUri = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`;

    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }

  /**
   * Get signing key from JWKS endpoint
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      throw new AppError(401, "Invalid token: Unable to verify signature");
    }
  }

  /**
   * Verify and decode ID token
   */
  async verifyIdToken(token: string): Promise<ICognitoIdToken> {
    try {
      // Decode header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid) {
        throw new AppError(401, "Invalid token: Missing key ID");
      }

      const kid = decodedHeader.header.kid;
      const signingKey = await this.getSigningKey(kid);

      // Verify token
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ["RS256"],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
        audience: this.appClientId,
      }) as ICognitoIdToken;

      // Additional validations
      this.validateTokenClaims(decoded);

      return decoded;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, "Invalid token: Verification failed");
    }
  }

  /**
   * Verify and decode Access token
   */
  async verifyAccessToken(token: string): Promise<ICognitoAccessToken> {
    try {
      // Decode header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header.kid) {
        throw new AppError(401, "Invalid token: Missing key ID");
      }

      const kid = decodedHeader.header.kid;
      const signingKey = await this.getSigningKey(kid);

      // Verify token
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ["RS256"],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
        audience: this.appClientId,
      }) as ICognitoAccessToken;

      // Validate token use
      if (decoded.token_use !== "access") {
        throw new AppError(401, "Invalid token: Wrong token type");
      }

      return decoded;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, "Invalid token: Verification failed");
    }
  }

  /**
   * Validate token claims
   */
  private validateTokenClaims(token: ICognitoIdToken): void {
    const now = Math.floor(Date.now() / 1000);

    // Check token use
    if (token.token_use !== "id") {
      throw new AppError(401, "Invalid token: Wrong token type");
    }

    // Check expiration
    if (token.exp < now) {
      throw new AppError(401, "Token expired");
    }

    // Check not before
    if (token.nbf && token.nbf > now) {
      throw new AppError(401, "Token not yet valid");
    }

    // Check issuer
    const expectedIssuer = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
    if (token.iss !== expectedIssuer) {
      throw new AppError(401, "Invalid token: Wrong issuer");
    }

    // Check audience
    if (token.aud !== this.appClientId) {
      throw new AppError(401, "Invalid token: Wrong audience");
    }
  }

  /**
   * Extract user information from ID token
   */
  extractUserInfo(token: ICognitoIdToken): {
    cognitoSub: string;
    email: string;
    name?: string;
    picture?: string;
    groups: string[];
  } {
    return {
      cognitoSub: token.sub,
      email: token.email,
      name: token.name,
      picture: token.picture,
      groups: token["cognito:groups"] || [],
    };
  }
}

export const jwtValidationService = new JwtValidationService();
