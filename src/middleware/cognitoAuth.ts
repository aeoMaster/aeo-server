import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { roleMappingService } from "../services/roleMappingService";

// Extend Express Request interface for Cognito auth
declare global {
  namespace Express {
    interface Request {
      cognitoUser?: {
        cognitoSub: string;
        email: string;
        name?: string;
        roles: string[];
        groups: string[];
      };
    }
  }
}

/**
 * Require authentication middleware for Cognito
 * Uses session-based authentication for consistency with Cognito flow
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  console.log("=== Cognito Session Authentication Debug ===");
  console.log("Session ID:", req.sessionID);
  console.log("Session data:", req.session);
  console.log("=============================================");

  // Import session service
  const { sessionService } = require("../services/sessionService");

  // Get session data
  const sessionData = sessionService.getSessionData(req);

  if (!sessionData) {
    console.log("❌ No session data found");
    return next(new AppError(401, "Not authenticated"));
  }

  console.log("✅ Session found for user:", sessionData.email);

  // Import User model
  const { User } = require("../models/User");

  // Get user from database to ensure they're still active
  User.findById(sessionData.userId)
    .then((user: any) => {
      if (!user || user.status !== "active") {
        console.log(`❌ User not found or inactive: ${sessionData.userId}`);
        return next(new AppError(401, "User not found or inactive"));
      }

      console.log("✅ User authenticated:", user.email);

      // Attach user to request
      req.user = user;

      // Also attach cognitoUser for backward compatibility
      req.cognitoUser = {
        cognitoSub: user.cognitoSub || "",
        email: user.email,
        name: user.name,
        roles: user.roles || [user.role],
        groups: user.cognitoGroups || [],
      };

      next();
    })
    .catch((error: Error) => {
      console.error("Database error during authentication:", error);
      next(new AppError(401, "Authentication failed"));
    });
};

/**
 * Require specific role middleware
 */
export const requireRole = (requiredRole: string) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.cognitoUser) {
        throw new AppError(401, "Authentication required");
      }

      if (!roleMappingService.hasRole(req.cognitoUser.roles, requiredRole)) {
        throw new AppError(
          403,
          `Access denied. Required role: ${requiredRole}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require any of the specified roles middleware
 */
export const requireAnyRole = (requiredRoles: string[]) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.cognitoUser) {
        throw new AppError(401, "Authentication required");
      }

      if (
        !roleMappingService.hasAnyRole(req.cognitoUser.roles, requiredRoles)
      ) {
        throw new AppError(
          403,
          `Access denied. Required one of: ${requiredRoles.join(", ")}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific permission middleware
 */
export const requirePermission = (requiredPermission: string) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.cognitoUser) {
        throw new AppError(401, "Authentication required");
      }

      if (
        !roleMappingService.hasPermission(
          req.cognitoUser.roles,
          requiredPermission
        )
      ) {
        throw new AppError(
          403,
          `Access denied. Required permission: ${requiredPermission}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user data if available, but doesn't require it
 * Uses session-based authentication for consistency
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Import session service
  const { sessionService } = require("../services/sessionService");

  // Get session data
  const sessionData = sessionService.getSessionData(req);

  if (sessionData) {
    // Import User model
    const { User } = require("../models/User");

    // Get user from database
    User.findById(sessionData.userId)
      .then((user: any) => {
        if (user && user.status === "active") {
          req.user = user;
          req.cognitoUser = {
            cognitoSub: user.cognitoSub || "",
            email: user.email,
            name: user.name,
            roles: user.roles || [user.role],
            groups: user.cognitoGroups || [],
          };
        }
        // Continue regardless of auth success/failure
        next();
      })
      .catch((error: Error) => {
        console.error("Database error during optional auth:", error);
        // Continue regardless of error
        next();
      });
  } else {
    // No session data, continue without authentication
    next();
  }
};

/**
 * Check if user has specific role (utility function)
 */
export const hasRole = (req: Request, role: string): boolean => {
  return req.cognitoUser
    ? roleMappingService.hasRole(req.cognitoUser.roles, role)
    : false;
};

/**
 * Check if user has any of the specified roles (utility function)
 */
export const hasAnyRole = (req: Request, roles: string[]): boolean => {
  return req.cognitoUser
    ? roleMappingService.hasAnyRole(req.cognitoUser.roles, roles)
    : false;
};

/**
 * Check if user has specific permission (utility function)
 */
export const hasPermission = (req: Request, permission: string): boolean => {
  return req.cognitoUser
    ? roleMappingService.hasPermission(req.cognitoUser.roles, permission)
    : false;
};

/**
 * Get user's highest role (utility function)
 */
export const getHighestRole = (req: Request): string => {
  return req.cognitoUser
    ? roleMappingService.getHighestRole(req.cognitoUser.roles)
    : "user";
};
