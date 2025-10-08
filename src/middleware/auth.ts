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
    console.log("=== Authentication Debug (Legacy) ===");
    console.log("Authorization header:", req.headers.authorization);
    console.log("=========================");

    passport.authenticate("jwt", { session: false }, (err: Error, user: any) => {
      if (err || !user) {
        console.log("Authentication failed:", err?.message || "No user found");
        return next(new AppError(401, "Unauthorized"));
      }
      console.log("Authentication successful for user:", user._id);
      req.user = user;
      next();
    })(req, res, next);
  }
};
