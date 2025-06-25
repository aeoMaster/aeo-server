import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { UsageService } from "../services/usageService";
import { IUser } from "../models/User";

export const checkUsage = (feature: "analysis" | "members") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const identifier = user.company
        ? { companyId: user.company._id.toString() }
        : { userId: user._id.toString() };

      const hasRemaining = await UsageService.hasRemaining(identifier, feature);

      if (!hasRemaining) {
        const message =
          feature === "analysis"
            ? "You have reached your monthly analysis limit."
            : "You have reached your team member limit.";
        return next(new AppError(403, `${message} Please upgrade your plan.`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
