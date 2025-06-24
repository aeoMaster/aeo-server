import { User } from "../models/User";
import { Company } from "../models/Company";
import { Subscription } from "../models/Subscription";
import { IPackage } from "../models/Package";
import { IUsage, Usage } from "../models/Usage";
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

  /**
   * Returns the current usage for a user or company. If usage records do not exist,
   * they are created based on the current subscription plan.
   */
  static async getCurrentUsage(userId: string, companyId?: string) {
    const usageIdentifier = companyId
      ? { company: companyId }
      : { user: userId };
    const usageDocs = await Usage.find({
      ...usageIdentifier,
      "period.end": { $gt: new Date() },
    });

    if (usageDocs.length > 0) {
      return this.formatUsage(usageDocs);
    }

    // No usage records found, so we'll create them.
    const ownerId = companyId
      ? (
          await Company.findById(companyId).select("owner").lean()
        )?.owner?.toString()
      : userId;

    console.log("ownerId", ownerId);
    if (!ownerId) {
      throw new AppError(404, "Could not determine subscription owner.");
    }

    const subscription = await Subscription.findOne({
      user: ownerId,
      status: { $in: ["active", "trial"] }, // Include both active and trial subscriptions
    })
      .populate<{ package: IPackage }>("package")
      .lean();
    console.log("subscription", subscription);

    if (!subscription || !subscription.package) {
      return this.formatUsage([]); // Return default empty usage if no subscription
    }

    // Create new usage records based on the subscription package
    return this.createAndFormatUsage(userId, companyId, subscription);
  }

  /**
   * Helper to format an array of usage documents into a structured object.
   */
  private static formatUsage(usageDocs: IUsage[]) {
    const usageData = {
      analysis: { used: 0, remaining: 0, total: 0 },
      api_call: { used: 0, remaining: 0, total: 0 },
      storage: { used: 0, remaining: 0, total: 0 },
    };

    for (const doc of usageDocs) {
      if (usageData[doc.type]) {
        usageData[doc.type] = {
          used: doc.limits.used,
          remaining: doc.limits.remaining,
          total: doc.limits.total,
        };
      }
    }
    return usageData;
  }

  /**
   * Helper to create usage records for all types and formats them.
   */
  private static async createAndFormatUsage(
    userId: string,
    companyId: string | undefined,
    subscription: any
  ) {
    const { features } = subscription.package;
    const usageTypes = ["analysis", "api_call", "storage"] as const;
    const newUsageDocs: IUsage[] = [];

    const period = {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };

    for (const type of usageTypes) {
      let total = 0;
      if (type === "analysis") total = features.maxAnalyses ?? 0;
      // Add more cases for 'api_call' and 'storage' if they exist in your package features

      const newUsage = await Usage.create({
        user: companyId ? undefined : userId,
        company: companyId,
        type: type,
        period,
        limits: { total, used: 0, remaining: total },
      });
      newUsageDocs.push(newUsage);
    }

    return this.formatUsage(newUsageDocs);
  }

  /**
   * Checks if a user or company has remaining usage for a specific feature.
   */
  static async hasRemaining(
    identifier: { userId?: string; companyId?: string },
    type: "analysis" | "members"
  ): Promise<boolean> {
    const { userId, companyId } = identifier;

    let subscriptionOwnerId = userId;
    if (companyId) {
      const company = await Company.findById(companyId).select("owner").lean();
      if (company) {
        subscriptionOwnerId = company.owner.toString();
      }
    }

    if (!subscriptionOwnerId) return false;

    const subscription = await Subscription.findOne({
      user: subscriptionOwnerId,
      status: { $in: ["active", "trial"] }, // Include both active and trial subscriptions
    })
      .populate("package")
      .lean();

    if (!subscription || !subscription.package) return false;

    const features = (subscription.package as IPackage).features;

    if (type === "analysis") {
      const usageIdentifier = companyId
        ? { company: companyId }
        : { user: userId };
      const usage = await Usage.findOne({
        ...usageIdentifier,
        type: "analysis",
      });
      const used = usage ? usage.limits.used : 0;

      return features.maxAnalyses < 0 || used < features.maxAnalyses;
    }

    if (type === "members") {
      if (!companyId) return true;

      const maxUsers = features.maxUsers ?? 1;
      if (maxUsers < 0) return true;

      const memberCount = await User.countDocuments({ company: companyId });
      return memberCount < maxUsers;
    }

    return true;
  }

  /**
   * Increments the usage count for a user or company.
   */
  static async incrementUsage(
    identifier: { userId?: string; companyId?: string },
    type: "analysis",
    amount: number = 1
  ) {
    const usageIdentifier = identifier.companyId
      ? { company: identifier.companyId }
      : { user: identifier.userId };

    const usage = await Usage.findOne({ ...usageIdentifier, type });

    if (usage) {
      usage.limits.used += amount;
      await usage.save();
      return usage;
    } else {
      // This case should ideally not happen if usage records are created with subscriptions.
      console.warn(
        `Usage document not found for incrementing. Identifier: ${JSON.stringify(
          usageIdentifier
        )}, Type: ${type}`
      );
      return;
    }
  }
}
