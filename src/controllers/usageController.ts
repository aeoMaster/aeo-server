import { Request, Response, NextFunction } from "express";
import { UsageService } from "../services/usageService";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

// Extend Express Request type to include user properties
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    company: string;
  };
}

// Validation schemas
const trackUsageSchema = z.object({
  type: z.enum(["analysis", "api_call", "storage"]),
  amount: z.number().min(1).default(1),
});

export class UsageController {
  static async trackUsage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const companyId = req.user?.company;
      if (!userId || !companyId) {
        throw new AppError(401, "User not authenticated");
      }

      const { type, amount } = trackUsageSchema.parse(req.body);
      const usage = await UsageService.trackUsage(
        userId,
        companyId,
        type,
        amount
      );
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }

  static async getUsage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const companyId = req.user?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const usage = await UsageService.getCurrentUsage(userId, companyId);
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }

  static async getUsageHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const companyId = req.user?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const type = req.query.type as string;

      const history = await UsageService.getUsageHistory(
        userId,
        companyId,
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
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const companyId = req.user?.company;
      if (!userId) {
        throw new AppError(401, "User not authenticated");
      }
      const usageType = req.query.type as "analysis" | "api_call" | "storage";

      if (!usageType) {
        throw new AppError(400, "Usage type is required");
      }

      const usage = await UsageService.getUsage(userId, companyId, usageType);
      res.json(usage);
    } catch (error) {
      next(error);
    }
  }
}
