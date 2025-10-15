import { Request, Response, NextFunction } from "express";
import passport from "passport";
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
 * Now uses JWT tokens (same as traditional auth) for consistency
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log("=== Cognito Authentication Debug ===");
  console.log("Authorization header:", req.headers.authorization);
  console.log("====================================");

  passport.authenticate(
    "jwt",
    { session: false },
    async (err: Error, user: any) => {
      if (err || !user) {
        console.log("Authentication failed:", err?.message || "No user found");
        return next(new AppError(401, "Unauthorized"));
      }

      console.log("Authentication successful for user:", user._id);

      // Verify user is active
      if (user.status !== "active") {
        return next(new AppError(401, "User account is not active"));
      }

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
    }
  )(req, res, next);
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
 * Now uses JWT tokens for consistency
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only try to authenticate if Authorization header is present
  if (!req.headers.authorization) {
    return next();
  }

  passport.authenticate(
    "jwt",
    { session: false },
    async (err: Error, user: any) => {
      if (!err && user && user.status === "active") {
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
    }
  )(req, res, next);
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
