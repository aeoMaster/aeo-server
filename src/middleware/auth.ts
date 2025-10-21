import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { AppError } from "./errorHandler";
import { configService } from "../services/configService";
import { requireAuth as requireCognitoAuth } from "./cognitoAuth";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Route to appropriate authentication method based on configuration
  if (configService.isCognitoAuth()) {
    // Use Cognito session-based authentication
    requireCognitoAuth(req, res, next);
  } else {
    // Use legacy JWT-based authentication
    // Check for token in Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    // If no Authorization header but we have a cookie token, set the Authorization header
    if (!authHeader && cookieToken) {
      req.headers.authorization = `Bearer ${cookieToken}`;
    }

    passport.authenticate(
      "jwt",
      { session: false },
      (err: Error, user: any) => {
        if (err || !user) {
          return next(new AppError(401, "Unauthorized"));
        }
        req.user = user;
        next();
      }
    )(req, res, next);
  }
};
