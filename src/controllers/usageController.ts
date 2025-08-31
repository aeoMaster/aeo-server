import { Request, Response, NextFunction } from "express";
import { UsageService } from "../services/usageService";
import { AppError } from "../middleware/errorHandler";
import { trackUsageSchema } from "../validations/usageValidation";

export class UsageController {
  static async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?._id;
      const companyId =
        (req.user as any)?.company?._id || (req.user as any)?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const usage = await UsageService.getCurrentUsage(
        userId,
        companyId?.toString()
      );
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }

  static async trackUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?._id;
      const companyId =
        (req.user as any)?.company?._id || (req.user as any)?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const { type, amount } = trackUsageSchema.parse(req.body);
      const usage = await UsageService.trackUsage(
        userId,
        companyId?.toString(),
        type,
        amount
      );
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }

  static async getUsageHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)?._id;
      const companyId =
        (req.user as any)?.company?._id || (req.user as any)?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const type = req.query.type as string;

      const history = await UsageService.getUsageHistory(
        userId,
        companyId?.toString(),
        type,
        page,
        limit
      );
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUsage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req.user as any)?._id;
      const companyId =
        (req.user as any)?.company?._id || (req.user as any)?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const usage = await UsageService.getCurrentUsage(
        userId,
        companyId?.toString()
      );
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }
}
