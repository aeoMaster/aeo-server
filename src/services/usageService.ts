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
    type?:
      | "analysis"
      | "clarity_scan"
      | "chat_message"
      | "api_call"
      | "storage"
      | string,
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
    type:
      | "analysis"
      | "clarity_scan"
      | "chat_message"
      | "api_call"
      | "storage"
      | "members",
    amount: number = 1
  ) {
    try {
      console.log("🔍 UsageService.trackUsage called");
      console.log("Parameters:", { userId, companyId, type, amount });

      if (!userId && !companyId) {
        throw new AppError(400, "Either userId or companyId must be provided");
      }

      // For members tracking, we need to handle it differently since it's not a traditional usage count
      if (type === "members") {
        if (!companyId) {
          throw new AppError(
            400,
            "Company ID is required for members tracking"
          );
        }

        // Get current member count
        const memberCount = await User.countDocuments({ company: companyId });

        // Check if adding the amount would exceed the limit
        const subscription = await Subscription.findOne({
          user: userId,
          status: { $in: ["active", "trial"] },
        })
          .populate("package")
          .lean();

        if (!subscription || !subscription.package) {
          throw new AppError(404, "No active subscription found");
        }

        const maxUsers =
          (subscription.package as IPackage).features.maxUsers ?? 1;
        if (maxUsers >= 0 && memberCount + amount > maxUsers) {
          throw new AppError(403, "Adding members would exceed the team limit");
        }

        // For members, we don't create a usage record, we just track the count
        return {
          type: "members",
          current: memberCount,
          limit: maxUsers,
          remaining: maxUsers < 0 ? -1 : Math.max(0, maxUsers - memberCount),
        };
      }

      console.log("🔍 Looking for usage record...");
      // Determine owner: user or company (never both)
      let usageOwner: { user?: any; company?: any } = {};
      if (companyId) {
        usageOwner = { company: companyId };
      } else if (userId) {
        usageOwner = { user: userId };
      }

      // Get current usage record
      const usage = await Usage.findOne({
        ...usageOwner,
        type,
        "period.end": { $gt: new Date() },
      });

      console.log("🔍 Usage record found:", usage ? "Yes" : "No");
      if (usage) {
        console.log("🔍 Current usage:", {
          used: usage.limits.used,
          remaining: usage.limits.remaining,
          total: usage.limits.total,
        });
      }

      if (!usage) {
        console.log("❌ No active usage record found");
        throw new AppError(404, "No active usage record found");
      }

      // Check if usage limit is exceeded
      if (usage.limits.remaining < amount) {
        console.log("❌ Usage limit exceeded");
        throw new AppError(403, "Usage limit exceeded");
      }

      console.log("✅ Updating usage...");
      // Update usage
      usage.count += amount;
      usage.limits.used += amount;
      usage.limits.remaining -= amount;
      await usage.save();

      console.log("✅ Usage updated successfully:", {
        used: usage.limits.used,
        remaining: usage.limits.remaining,
        total: usage.limits.total,
      });

      return usage;
    } catch (error) {
      console.error("❌ UsageService.trackUsage error:", error);
      throw new AppError(500, "Failed to track usage");
    }
  }

  static async getUsage(
    userId: string | undefined,
    companyId: string | undefined,
    type: "analysis" | "clarity_scan" | "chat_message" | "api_call" | "storage"
  ) {
    try {
      // Determine owner: user or company (never both)
      let usageOwner: { user?: any; company?: any } = {};
      if (companyId) {
        usageOwner = { company: companyId };
      } else if (userId) {
        usageOwner = { user: userId };
      }

      const usage = await Usage.findOne({
        ...usageOwner,
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
      ).populate<{ package: IPackage }>("package");

      if (!subscription) {
        throw new AppError(404, "Subscription not found");
      }

      // Create new usage records for all types
      const types: (
        | "analysis"
        | "clarity_scan"
        | "chat_message"
        | "api_call"
        | "storage"
      )[] = ["analysis", "clarity_scan", "chat_message", "api_call", "storage"];
      const periodEnd = new Date(
        Date.now() +
          (subscription.billingCycle === "monthly" ? 30 : 365) *
            24 *
            60 *
            60 *
            1000
      );

      for (const type of types) {
        let total = 0;
        switch (type) {
          case "analysis":
            total = subscription.package.features.maxAnalyses ?? 0;
            break;
          case "clarity_scan":
            total = subscription.package.features.maxClarityScans ?? 0;
            break;
          case "chat_message":
            total = subscription.package.features.maxChatMessages ?? 0;
            break;
          case "api_call":
          case "storage":
            total = 1000; // Default limits
            break;
        }

        await Usage.create({
          user: subscription.user,
          company: subscription.company,
          type,
          period: {
            start: new Date(),
            end: periodEnd,
          },
          limits: {
            total,
            used: 0,
            remaining: total,
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
    console.log("🔍 getCurrentUsage called with:", { userId, companyId });

    const usageIdentifier = companyId
      ? { company: companyId }
      : { user: userId };
    console.log("🔍 Usage identifier:", usageIdentifier);

    // Get only the most recent active usage records
    const usageDocs = await Usage.find({
      ...usageIdentifier,
      "period.end": { $gt: new Date() },
    }).sort({ updatedAt: -1 }); // Sort by most recently updated

    console.log("🔍 Found usage docs:", usageDocs.length);
    usageDocs.forEach((doc) => {
      console.log(
        `🔍 Usage doc - type: ${doc.type}, used: ${doc.limits.used}, total: ${doc.limits.total}, period:`,
        doc.period
      );
    });

    // Clean up old usage records that might be interfering
    if (usageDocs.length > 5) {
      // If we have too many records, clean up old ones
      console.log("🔍 Cleaning up old usage records...");
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      await Usage.deleteMany({
        ...usageIdentifier,
        $or: [
          { "period.end": { $lt: now } },
          { "limits.total": 0, updatedAt: { $lt: thirtyDaysAgo } },
        ],
      });
      console.log("🔍 Cleanup completed");
    }

    let usageData = this.formatUsage(usageDocs);
    console.log("🔍 Formatted usage data:", usageData);

    // Add members tracking for companies
    if (companyId) {
      const memberCount = await User.countDocuments({ company: companyId });
      const ownerId = (
        await Company.findById(companyId).select("owner").lean()
      )?.owner?.toString();

      if (ownerId) {
        const subscription = await Subscription.findOne({
          user: ownerId,
          status: { $in: ["active", "trial"] },
        })
          .populate("package")
          .lean();

        if (subscription && subscription.package) {
          const maxUsers =
            (subscription.package as IPackage).features.maxUsers ?? 1;
          usageData.members = {
            used: memberCount,
            remaining: maxUsers < 0 ? -1 : Math.max(0, maxUsers - memberCount),
            total: maxUsers,
          };
        }
      }
    }

    if (usageDocs.length > 0) {
      console.log("🔍 Returning existing usage data");
      return usageData;
    }

    // No usage records found, so we'll create them.
    const ownerId = companyId
      ? (
          await Company.findById(companyId).select("owner").lean()
        )?.owner?.toString()
      : userId;

    console.log(
      "🔍 No usage records found, creating new ones. ownerId:",
      ownerId
    );
    if (!ownerId) {
      throw new AppError(404, "Could not determine subscription owner.");
    }

    const subscription = await Subscription.findOne({
      user: ownerId,
      status: { $in: ["active", "trial"] }, // Include both active and trial subscriptions
    })
      .populate<{ package: IPackage }>("package")
      .lean();
    console.log("🔍 Found subscription:", subscription ? "Yes" : "No");

    if (!subscription || !subscription.package) {
      console.log("🔍 No subscription found, returning empty usage data");
      return usageData; // Return usage data with members info if available
    }

    // Create new usage records based on the subscription package
    console.log("🔍 Creating new usage records...");
    const newUsageData = await this.createAndFormatUsage(
      userId,
      companyId,
      subscription
    );
    console.log("🔍 Created new usage data:", newUsageData);

    // Merge with members data if available
    if (companyId && usageData.members) {
      newUsageData.members = usageData.members;
    }

    return newUsageData;
  }

  /**
   * Helper to format an array of usage documents into a structured object.
   */
  private static formatUsage(usageDocs: IUsage[]) {
    const usageData: Record<
      string,
      { used: number; remaining: number; total: number }
    > = {
      analysis: { used: 0, remaining: 0, total: 0 },
      clarity_scan: { used: 0, remaining: 0, total: 0 },
      chat_message: { used: 0, remaining: 0, total: 0 },
      api_call: { used: 0, remaining: 0, total: 0 },
      storage: { used: 0, remaining: 0, total: 0 },
      members: { used: 0, remaining: 0, total: 0 },
    };

    // Group by type and find the best record for each type
    const groupedByType: Record<string, IUsage[]> = {};

    for (const doc of usageDocs) {
      if (!groupedByType[doc.type]) {
        groupedByType[doc.type] = [];
      }
      groupedByType[doc.type].push(doc);
    }

    // For each type, use the best record (prioritize non-zero totals and recent periods)
    for (const [type, docs] of Object.entries(groupedByType)) {
      if (usageData[type]) {
        // Sort by multiple criteria:
        // 1. Non-zero totals first
        // 2. More recent period end dates
        // 3. More recent updatedAt timestamps
        const bestRecord = docs.sort((a, b) => {
          // First priority: non-zero totals
          const aHasTotal = a.limits.total > 0;
          const bHasTotal = b.limits.total > 0;
          if (aHasTotal && !bHasTotal) return -1;
          if (!aHasTotal && bHasTotal) return 1;

          // Second priority: more recent period end
          const aPeriodEnd = new Date(a.period.end).getTime();
          const bPeriodEnd = new Date(b.period.end).getTime();
          if (aPeriodEnd !== bPeriodEnd) return bPeriodEnd - aPeriodEnd;

          // Third priority: more recent updatedAt
          const aUpdatedAt = new Date(a.updatedAt).getTime();
          const bUpdatedAt = new Date(b.updatedAt).getTime();
          return bUpdatedAt - aUpdatedAt;
        })[0];

        usageData[type] = {
          used: bestRecord.limits.used,
          remaining: bestRecord.limits.remaining,
          total: bestRecord.limits.total,
        };

        console.log(`🔍 Using best ${type} record:`, {
          used: bestRecord.limits.used,
          total: bestRecord.limits.total,
          periodEnd: bestRecord.period.end,
          updatedAt: bestRecord.updatedAt,
        });
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
    const usageTypes = [
      "analysis",
      "clarity_scan",
      "chat_message",
      "api_call",
      "storage",
    ] as const;
    const newUsageDocs: IUsage[] = [];

    const period = {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };

    for (const type of usageTypes) {
      let total = 0;
      switch (type) {
        case "analysis":
          total = features.maxAnalyses ?? 0;
          break;
        case "clarity_scan":
          total = features.maxClarityScans ?? 0;
          break;
        case "chat_message":
          total = features.maxChatMessages ?? 0;
          break;
        case "api_call":
          total = 1000; // Default API call limit
          break;
        case "storage":
          total = 1000; // Default storage limit
          break;
      }

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
    type: "analysis" | "clarity_scan" | "chat_message" | "members"
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

    // Handle usage-based limits (analysis, clarity_scan, chat_message)
    if (
      type === "analysis" ||
      type === "clarity_scan" ||
      type === "chat_message"
    ) {
      const usageIdentifier = companyId
        ? { company: companyId }
        : { user: userId };
      const usage = await Usage.findOne({
        ...usageIdentifier,
        type: type,
      });
      const used = usage ? usage.limits.used : 0;

      let maxLimit = 0;
      switch (type) {
        case "analysis":
          maxLimit = features.maxAnalyses ?? 0;
          break;
        case "clarity_scan":
          maxLimit = features.maxClarityScans ?? 0;
          break;
        case "chat_message":
          maxLimit = features.maxChatMessages ?? 0;
          break;
      }

      return maxLimit < 0 || used < maxLimit; // -1 means unlimited
    }

    if (type === "members") {
      if (!companyId) return true;

      const maxUsers = features.maxUsers ?? 1;
      if (maxUsers < 0) return true; // -1 means unlimited

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
    type: "analysis" | "clarity_scan" | "chat_message",
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
