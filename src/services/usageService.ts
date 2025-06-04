import { Usage } from "../models/Usage";
import { Subscription } from "../models/Subscription";
import { AppError } from "../middleware/errorHandler";

export class UsageService {
  static async getUsageHistory(
    userId: string | undefined,
    companyId: string | undefined,
    type?: "analysis" | "api_call" | "storage" | string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const query: any = {};
      if (userId) query.user = userId;
      if (companyId) query.company = companyId;
      if (type) query.type = type;

      const skip = (page - 1) * limit;

      const [usage, total] = await Promise.all([
        Usage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Usage.countDocuments(query),
      ]);

      return {
        usage,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(500, "Failed to get usage history");
    }
  }

  static async trackUsage(
    userId: string | undefined,
    companyId: string | undefined,
    type: "analysis" | "api_call" | "storage",
    amount: number = 1
  ) {
    try {
      if (!userId && !companyId) {
        throw new AppError(400, "Either userId or companyId must be provided");
      }

      // Get current usage record
      const usage = await Usage.findOne({
        user: userId,
        company: companyId,
        type,
        "period.end": { $gt: new Date() },
      });

      if (!usage) {
        throw new AppError(404, "No active usage record found");
      }

      // Check if usage limit is exceeded
      if (usage.limits.remaining < amount) {
        throw new AppError(403, "Usage limit exceeded");
      }

      // Update usage
      usage.count += amount;
      usage.limits.used += amount;
      usage.limits.remaining -= amount;
      await usage.save();

      return usage;
    } catch (error) {
      throw new AppError(500, "Failed to track usage");
    }
  }

  static async getUsage(
    userId: string | undefined,
    companyId: string | undefined,
    type: "analysis" | "api_call" | "storage"
  ) {
    try {
      const usage = await Usage.findOne({
        user: userId,
        company: companyId,
        type,
        "period.end": { $gt: new Date() },
      });

      if (!usage) {
        throw new AppError(404, "No active usage record found");
      }

      return usage;
    } catch (error) {
      throw new AppError(500, "Failed to get usage");
    }
  }

  static async resetUsage(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(
        subscriptionId
      ).populate<{ package: { features: { maxAnalyses: number } } }>("package");

      if (!subscription) {
        throw new AppError(404, "Subscription not found");
      }

      // Create new usage records for all types
      const types: ("analysis" | "api_call" | "storage")[] = [
        "analysis",
        "api_call",
        "storage",
      ];
      const periodEnd = new Date(
        Date.now() +
          (subscription.billingCycle === "monthly" ? 30 : 365) *
            24 *
            60 *
            60 *
            1000
      );

      for (const type of types) {
        await Usage.create({
          user: subscription.user,
          company: subscription.company,
          type,
          period: {
            start: new Date(),
            end: periodEnd,
          },
          limits: {
            total:
              type === "analysis"
                ? subscription.package.features.maxAnalyses
                : 1000,
            used: 0,
            remaining:
              type === "analysis"
                ? subscription.package.features.maxAnalyses
                : 1000,
          },
        });
      }

      return { success: true };
    } catch (error) {
      throw new AppError(500, "Failed to reset usage");
    }
  }

  static async getCurrentUsage(userId: string, companyId?: string) {
    try {
      const usage = await Usage.find({
        user: userId,
        company: companyId || undefined,
        "period.end": { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (!usage || usage.length === 0) {
        return {
          analysis: { used: 0, remaining: 0, total: 0 },
          api_call: { used: 0, remaining: 0, total: 0 },
          storage: { used: 0, remaining: 0, total: 0 },
        };
      }

      // Group usage by type
      const usageByType = usage.reduce(
        (acc, curr) => {
          acc[curr.type] = {
            used: curr.limits.used,
            remaining: curr.limits.remaining,
            total: curr.limits.total,
          };
          return acc;
        },
        {} as Record<string, { used: number; remaining: number; total: number }>
      );

      return usageByType;
    } catch (error) {
      throw new AppError(500, "Failed to get current usage");
    }
  }
}
