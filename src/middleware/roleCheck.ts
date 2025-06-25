import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

type UserRole = "owner" | "admin" | "user" | "viewer";

export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { role: UserRole };

    if (!user || !allowedRoles.includes(user.role)) {
      throw new AppError(403, "Insufficient permissions");
    }

    next();
  };
};
