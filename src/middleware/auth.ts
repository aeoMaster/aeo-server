import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { AppError } from "./errorHandler";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log("=== Authentication Debug ===");
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
};
