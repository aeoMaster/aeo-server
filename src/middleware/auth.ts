import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { AppError } from "./errorHandler";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate("jwt", { session: false }, (err: Error, user: any) => {
    if (err || !user) {
      return next(new AppError(401, "Unauthorized"));
    }
    req.user = user;
    next();
  })(req, res, next);
};
