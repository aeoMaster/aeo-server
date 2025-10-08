import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { sessionService } from "../services/sessionService";
import { roleMappingService } from "../services/roleMappingService";
import { User } from "../models/User";

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
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user has a valid session
    if (!sessionService.isAuthenticated(req)) {
      throw new AppError(401, "Authentication required");
    }

    const sessionData = sessionService.getSessionData(req);
    if (!sessionData) {
      throw new AppError(401, "Invalid session");
    }

    // Load user from database to get latest data
    const user = await User.findOne({ cognitoSub: sessionData.cognitoSub });
    if (!user || user.status !== "active") {
      throw new AppError(401, "User not found or inactive");
    }

    // Attach user data to request
    req.cognitoUser = {
      cognitoSub: sessionData.cognitoSub,
      email: sessionData.email,
      name: sessionData.name,
      roles: sessionData.roles,
      groups: sessionData.groups,
    };

    // Also attach full user object for backward compatibility
    req.user = user as any;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    next(error);
  }
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
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (sessionService.isAuthenticated(req)) {
      const sessionData = sessionService.getSessionData(req);
      if (sessionData) {
        const user = await User.findOne({ cognitoSub: sessionData.cognitoSub });
        if (user && user.status === "active") {
          req.cognitoUser = {
            cognitoSub: sessionData.cognitoSub,
            email: sessionData.email,
            name: sessionData.name,
            roles: sessionData.roles,
            groups: sessionData.groups,
          };
          req.user = user as any;
        }
      }
    }
    next();
  } catch (error) {
    // Don't throw error for optional auth, just continue without user data
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
