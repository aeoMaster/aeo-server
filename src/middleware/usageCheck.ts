import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { UsageService } from "../services/usageService";
import { IUser } from "../models/User";

export const checkUsage = (
  feature: "analysis" | "clarity_scan" | "chat_message" | "members"
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;

      const identifier = user.company
        ? { companyId: user.company._id.toString() }
        : { userId: user._id.toString() };

      const hasRemaining = await UsageService.hasRemaining(identifier, feature);

      if (!hasRemaining) {
        let message = "";
        switch (feature) {
          case "analysis":
            message = "You have reached your monthly analysis limit.";
            break;
          case "clarity_scan":
            message = "You have reached your monthly clarity scan limit.";
            break;
          case "chat_message":
            message = "You have reached your monthly AI chat message limit.";
            break;
          case "members":
            message = "You have reached your team member limit.";
            break;
          default:
            message = "You have reached your usage limit.";
        }
        return next(new AppError(403, `${message} Please upgrade your plan.`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
