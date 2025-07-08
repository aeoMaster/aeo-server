import { Analysis } from "../models/Analysis";
import { AppError } from "../middleware/errorHandler";
import mongoose from "mongoose";

interface AnalysisFilters {
  search?: string;
  type?: string;
  company?: string;
  section?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface AnalysisHistoryResult {
  analyses: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AnalysisService {
  static async getAnalysisHistory(
    userId?: string,
    filters: AnalysisFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
    grouped: boolean = false
  ): Promise<AnalysisHistoryResult> {
    try {
      const query: Record<string, any> = {};
      if (userId) {
        // Convert string userId to ObjectId if it's a valid ObjectId
        try {
          query.user = new mongoose.Types.ObjectId(userId);
        } catch (error) {
          // If conversion fails, use the string as is
          query.user = userId;
        }
      }

      if (filters.search) {
        query.$or = [
          { content: { $regex: filters.search, $options: "i" } },
          { company: { $regex: filters.search, $options: "i" } },
          { section: { $regex: filters.search, $options: "i" } },
        ];
      }

      if (filters.type) query.type = filters.type;
      if (filters.company) query.company = filters.company;
      if (filters.section) query.section = filters.section;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const skip = (pagination.page - 1) * pagination.limit;

      let analyses: any[];
      let total: number;

      if (grouped) {
        const groupedResults = await Analysis.aggregate([
          { $match: query },
          {
            $group: {
              _id: "$url",
              latestAnalysis: { $first: "$$ROOT" },
              scanCount: { $sum: 1 },
              firstScan: { $min: "$createdAt" },
              lastScan: { $max: "$createdAt" },
            },
          },
          { $sort: { "latestAnalysis.createdAt": -1 } },
          { $skip: skip },
          { $limit: pagination.limit },
        ]);

        const totalGroups = await Analysis.aggregate([
          { $match: query },
          { $group: { _id: "$url" } },
          { $count: "total" },
        ]);

        total = totalGroups[0]?.total || 0;
        analyses = groupedResults.map((group) => ({
          ...group.latestAnalysis,
          scanCount: group.scanCount,
          firstScan: group.firstScan,
          lastScan: group.lastScan,
        }));
      } else {
        total = await Analysis.countDocuments(query);

        analyses = await Analysis.find(query)
          .sort({ createdAt: -1 })
          .select("-rawAnalysis")
          .skip(skip)
          .limit(pagination.limit);
      }

      return {
        analyses,
        pagination: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      throw new AppError(500, "Failed to fetch analysis history");
    }
  }

  static async getAnalysesForUrl(
    userId: string,
    url: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<AnalysisHistoryResult> {
    try {
      const query: any = { url: url };

      if (userId && userId !== "test-user") {
        query.user = userId;
      }

      const skip = (pagination.page - 1) * pagination.limit;

      const total = await Analysis.countDocuments(query);

      const analyses = await Analysis.find(query)
        .sort({ createdAt: -1 })
        .select("-rawAnalysis")
        .skip(skip)
        .limit(pagination.limit);

      return {
        analyses,
        pagination: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      };
    } catch (error) {
      console.error("Error in getAnalysesForUrl:", error);
      throw new AppError(500, "Failed to fetch analyses for URL");
    }
  }
}
