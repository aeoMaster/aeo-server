import { Request, Response, NextFunction } from "express";
import { AnalysisService } from "../services/analysisService";

import { z } from "zod";
import { IUser } from "@/models/User";

// Validation schema for query parameters
const historyQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  company: z.string().optional(),
  section: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
  grouped: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export class AnalysisController {
  static async getHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user: IUser = req.user as IUser;
      const userId = user._id.toString();

      // Validate and parse query parameters
      const queryParams = historyQuerySchema.parse(req.query);

      const {
        search,
        type,
        url,
        company,
        section,
        startDate,
        endDate,
        page,
        limit,
        grouped,
      } = queryParams;

      const result = await AnalysisService.getAnalysisHistory(
        userId,
        { search, type, url, company, section, startDate, endDate },
        { page, limit },
        grouped
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getAnalysesForUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user: IUser = req.user as IUser;
      const userId = user._id.toString();
      const encodedUrl = req.params.url;
      const url = decodeURIComponent(encodedUrl);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await AnalysisService.getAnalysesForUrl(userId, url, {
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
