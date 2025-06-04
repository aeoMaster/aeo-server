import { Analysis } from "../models/Analysis";
import { AppError } from "../middleware/errorHandler";

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
    userId: string,
    filters: AnalysisFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<AnalysisHistoryResult> {
    try {
      const query: Record<string, any> = { user: userId };

      // Apply search filter
      if (filters.search) {
        query.$or = [
          { content: { $regex: filters.search, $options: "i" } },
          { company: { $regex: filters.search, $options: "i" } },
          { section: { $regex: filters.search, $options: "i" } },
        ];
      }

      // Apply other filters
      if (filters.type) query.type = filters.type;
      if (filters.company) query.company = filters.company;
      if (filters.section) query.section = filters.section;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      // Calculate skip value for pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Get total count for pagination
      const total = await Analysis.countDocuments(query);

      // Get paginated results
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
      throw new AppError(500, "Failed to fetch analysis history");
    }
  }
}
