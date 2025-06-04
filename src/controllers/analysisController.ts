import { Request, Response, NextFunction } from "express";
import { AnalysisService } from "../services/analysisService";

import { z } from "zod";

// Validation schema for query parameters
const historyQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
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
});

export class AnalysisController {
  static async getHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req.user as { _id: string })._id;

      // Validate and parse query parameters
      const queryParams = historyQuerySchema.parse(req.query);

      const {
        search,
        type,
        company,
        section,
        startDate,
        endDate,
        page,
        limit,
      } = queryParams;

      const result = await AnalysisService.getAnalysisHistory(
        userId,
        { search, type, company, section, startDate, endDate },
        { page, limit }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
