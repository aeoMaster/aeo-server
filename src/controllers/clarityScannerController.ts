import { Request, Response, NextFunction } from "express";
import { ClarityScannerService } from "../services/clarityScannerService";
import { IClarityScan } from "../models/ClarityScan";
import { z } from "zod";

// Response types
interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface ClarityScanHistoryResponse {
  scans: (IClarityScan & {
    scanCount?: number;
    firstScan?: Date;
    lastScan?: Date;
  })[];
  pagination: PaginationState;
}

// Validation schemas
const scanUrlSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

// Helper to ensure summaryByCategory is always a plain object
function toPlainCategoryMap(input: any) {
  if (!input) return {};
  if (typeof input[Symbol.iterator] === "function")
    return Object.fromEntries(input);
  if (typeof input === "object" && !Array.isArray(input)) return input;
  return {};
}

export class ClarityScannerController {
  static async scanUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = scanUrlSchema.parse(req.query);
      const userId = (req.user as any)?._id;

      const scanResult = await ClarityScannerService.scanUrl(url, userId);

      // Return the scan result without HTML snapshot for API response
      const { htmlSnapshot, summaryByCategory, ...resultWithoutHtml } =
        scanResult.toObject();

      return res.json({
        ...resultWithoutHtml,
        summaryByCategory: toPlainCategoryMap(summaryByCategory),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getScanHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?._id;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const skip = (page - 1) * limit;
      const ClarityScan = (await import("../models/ClarityScan")).ClarityScan;
      const query = userId ? { user: userId } : {};

      // Always get grouped results (latest scan per URL)
      const scanHistory =
        await ClarityScannerService.getScanHistoryGroupedByUrl(
          userId,
          limit,
          skip
        );

      // Get total count of unique URLs
      const uniqueUrlsPipeline = [
        { $match: query },
        { $group: { _id: "$url" } },
        { $count: "total" },
      ];
      const uniqueUrlsResult = await ClarityScan.aggregate(uniqueUrlsPipeline);
      const totalCount =
        uniqueUrlsResult.length > 0 ? uniqueUrlsResult[0].total : 0;

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const response: ClarityScanHistoryResponse = {
        scans: scanHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
      };

      return res.json(response);
    } catch (error) {
      return next(error);
    }
  }

  static async getScanById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?._id;

      const scan = await ClarityScannerService.getScanById(id, userId);

      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Return the scan result without HTML snapshot for API response
      const {
        htmlSnapshot: html2,
        summaryByCategory: summary2,
        ...result2
      } = scan.toObject();

      return res.json({
        ...result2,
        summaryByCategory: toPlainCategoryMap(summary2),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getScanWithHtml(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?._id;

      const scan = await (
        await import("../models/ClarityScan")
      ).ClarityScan.findOne(userId ? { _id: id, user: userId } : { _id: id });

      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      const scanObject = scan.toObject();
      const { htmlSnapshot, summaryByCategory, ...resultWithoutHtml } =
        scanObject;

      return res.json({
        ...resultWithoutHtml,
        htmlSnapshot: scanObject.htmlSnapshot,
        summaryByCategory: toPlainCategoryMap(summaryByCategory),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteScan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?._id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const result = await (
        await import("../models/ClarityScan")
      ).ClarityScan.findOneAndDelete({
        _id: id,
        user: userId,
      });

      if (!result) {
        return res.status(404).json({ message: "Scan not found" });
      }

      return res.json({ message: "Scan deleted successfully" });
    } catch (error) {
      return next(error);
    }
  }

  static async getScansForUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.params;
      const userId = (req.user as any)?._id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const scans = await ClarityScannerService.getScansForUrl(
        decodeURIComponent(url),
        userId,
        limit
      );

      const scanCount = await ClarityScannerService.getScanCountForUrl(
        decodeURIComponent(url),
        userId
      );

      return res.json({
        url: decodeURIComponent(url),
        scans,
        totalCount: scanCount,
        limit,
      });
    } catch (error) {
      return next(error);
    }
  }
}
