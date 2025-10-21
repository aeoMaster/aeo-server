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
    type?: "analysis" | "clarity_scan" | "chat_message" | "storage" | string,
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
    type: "analysis" | "clarity_scan" | "chat_message" | "storage" | "members",
    amount: number = 1
  ) {
    try {
      console.log("🔍 UsageService.trackUsage called");
      console.log("Parameters:", {
        userId,
        companyId,
        type,
        amount,
      });

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

      // First, ensure usage records exist by calling getCurrentUsage
      // This will create missing usage records if needed
      let currentUsageData;
      if (userId) {
        currentUsageData = await this.getCurrentUsage(userId, companyId);
      } else if (companyId) {
        // If no userId but we have companyId, we need to find the company owner
        const company = await Company.findById(companyId)
          .select("owner")
          .lean();
        if (company?.owner) {
          currentUsageData = await this.getCurrentUsage(
            company.owner.toString(),
            companyId
          );
        }
      }

      // Check if we have the usage data for the requested type
      if (!currentUsageData || !currentUsageData[type]) {
        console.log("❌ No usage data found for type:", type);
        throw new AppError(
          404,
          `No usage data found for ${type}. Please contact support to initialize your usage records.`
        );
      }

      const usageInfo = currentUsageData[type];
      console.log("🔍 Found usage info:", usageInfo);

      // Check if usage limit is exceeded
      if (usageInfo.remaining < amount) {
        console.log("❌ Usage limit exceeded");
        throw new AppError(403, "Usage limit exceeded");
      }

      // Now look for the specific usage record to update
      const usageIdentifier = companyId
        ? { company: companyId }
        : { user: userId };

      const usage = await Usage.findOne({
        ...usageIdentifier,
        type,
        "period.end": { $gt: new Date() },
      });

      if (!usage) {
        console.log("❌ No usage record found for updating");
        throw new AppError(
          404,
          "Usage record not found for updating. Please contact support."
        );
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
    type: "analysis" | "clarity_scan" | "chat_message" | "storage"
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
        | "storage"
      )[] = ["analysis", "clarity_scan", "chat_message", "storage"];
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
    let usageDocs = await Usage.find({
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

    // Note: We now keep usage records with 0 totals (for disabled features)
    // so frontend knows the feature exists but is disabled

    let usageData = this.formatUsage(usageDocs);
    console.log("🔍 Formatted usage data:", usageData);

    // Add members tracking for companies and individual users
    const ownerId = companyId
      ? (
          await Company.findById(companyId).select("owner").lean()
        )?.owner?.toString()
      : userId;

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

        if (companyId) {
          // For companies, count actual members
          const memberCount = await User.countDocuments({ company: companyId });
          usageData.members = {
            used: memberCount,
            remaining: maxUsers < 0 ? -1 : Math.max(0, maxUsers - memberCount),
            total: maxUsers,
          };
        } else {
          // For individual users, they count as 1 member
          usageData.members = {
            used: 1,
            remaining: Math.max(0, maxUsers - 1),
            total: maxUsers,
          };
        }
      }
    }

    // Check if we need to create missing usage records
    const expectedTypes = [
      "analysis",
      "clarity_scan",
      "chat_message",
      "storage",
    ] as const;
    const existingTypes = usageDocs.map((doc) => doc.type);
    const missingTypes = expectedTypes.filter(
      (type) => !existingTypes.includes(type)
    );

    if (missingTypes.length > 0) {
      console.log(
        `🔍 Found missing usage record types: ${missingTypes.join(", ")}`
      );

      // Get subscription to create missing records
      const ownerId = companyId
        ? (
            await Company.findById(companyId).select("owner").lean()
          )?.owner?.toString()
        : userId;

      if (ownerId) {
        const subscription = await Subscription.findOne({
          user: ownerId,
          status: { $in: ["active", "trial"] },
        })
          .populate<{ package: IPackage }>("package")
          .lean();

        if (subscription && subscription.package) {
          console.log("🔍 Creating missing usage records...");
          const missingUsageData = await this.createMissingUsageRecords(
            userId,
            companyId,
            subscription,
            missingTypes
          );

          // Merge the missing usage data with existing data
          Object.assign(usageData, missingUsageData);
          console.log("🔍 Merged missing usage data:", missingUsageData);
        }
      }
    }

    console.log("🔍 Returning usage data with all types");
    return usageData;
  }

  /**
   * Helper to format an array of usage documents into a structured object.
   */
  private static formatUsage(usageDocs: IUsage[]) {
    const usageData: Record<
      string,
      { used: number; remaining: number; total: number }
    > = {};

    // Only initialize types that we have actual records for
    // Don't pre-initialize with 0 values

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

      // Only add usage data if the record has a valid total
      if (bestRecord.limits.total > 0) {
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
      } else {
        console.log(`🔍 Skipping ${type} record with 0 total`);
      }
    }

    return usageData;
  }

  /**
   * Helper to create missing usage records for specific types.
   */
  private static async createMissingUsageRecords(
    userId: string,
    companyId: string | undefined,
    subscription: any,
    missingTypes: string[]
  ) {
    const { features } = subscription.package;
    const newUsageDocs: IUsage[] = [];

    const period = {
      start: subscription.currentPeriodStart || new Date(),
      end:
        subscription.currentPeriodEnd ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    for (const type of missingTypes) {
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
        case "storage":
          total = 1000; // Default storage limit
          break;
      }

      // Create usage record even if total is 0 (for disabled features)
      const newUsage = await Usage.create({
        user: companyId ? undefined : userId,
        company: companyId,
        type: type,
        period,
        limits: { total, used: 0, remaining: total },
        count: 0,
      });
      newUsageDocs.push(newUsage);
      console.log(
        `✅ Created missing usage record for ${type}: total=${total}`
      );
    }

    // Format and return the newly created usage data
    const usageData: Record<
      string,
      { used: number; remaining: number; total: number }
    > = {};

    for (const doc of newUsageDocs) {
      usageData[doc.type] = {
        used: doc.limits.used,
        remaining: doc.limits.remaining,
        total: doc.limits.total,
      };
    }

    return usageData;
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
        "period.end": { $gt: new Date() }, // Only check current period
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
