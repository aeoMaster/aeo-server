import { User } from "../models/User";
import { Package, IPackage } from "../models/Package";
import { Subscription, ISubscription } from "../models/Subscription";
import { Usage } from "../models/Usage";
import { AppError } from "../middleware/errorHandler";
import { Company } from "../models/Company";

export class SubscriptionService {
  static async getCurrentSubscription(userId: string) {
    try {
      console.log("getCurrentSubscription called with userId:", userId);
      let subscription = await Subscription.findOne({ user: userId })
        .populate("package")
        .sort({ createdAt: -1 });

      console.log("Found existing subscription:", subscription);
      if (!subscription) {
        console.log("No subscription found, creating free tier...");
        // Get the free tier package
        const freePackage = await Package.findOne({ name: "Free" });
        console.log("Free package found:", freePackage);
        if (!freePackage) {
          // If Free package doesn't exist, create it
          console.log("Free package not found, creating it...");
          const newFreePackage = await Package.create({
            name: "Free",
            type: "individual",
            price: {
              monthly: 0,
              yearly: 0,
            },
            stripePriceId: {
              monthly: "price_free_monthly",
              yearly: "price_free_yearly",
            },
            features: {
              maxAnalyses: 2,
              maxUsers: 1,
              advancedReporting: false,
              apiAccess: false,
              customBranding: false,
              prioritySupport: false,
            },
            status: "active",
            trialDays: 0,
          });
          console.log("Created new free package:", newFreePackage);
          if (!newFreePackage) {
            throw new AppError(
              404,
              "Free tier package not found and could not be created"
            );
          }
        }

        // Create a free subscription using the createFreeTierSubscription method
        console.log("Creating free tier subscription...");
        subscription =
          await SubscriptionService.createFreeTierSubscription(userId);
        console.log("Created subscription:", subscription);
      }

      return subscription;
    } catch (error) {
      console.error("Error in getCurrentSubscription:", error);
      throw new AppError(500, "Failed to get current subscription");
    }
  }

  static async createSubscription(
    userId: string,
    packageId: string,
    billingCycle: "monthly" | "yearly"
  ) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new AppError(404, "User not found");

      const package_ = await Package.findById(packageId);
      if (!package_) throw new AppError(404, "Package not found");

      console.log("package_", package_);
      // Create subscription record
      const subscription = await Subscription.create({
        user: userId,
        package: packageId,
        status: "trial",
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() +
            (billingCycle === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000
        ),
        stripeSubscriptionId: `local_${Date.now()}`, // Temporary local ID
        stripeCustomerId: `local_${userId}`, // Temporary local ID
        trialEndsAt:
          package_.trialDays > 0
            ? new Date(Date.now() + package_.trialDays * 24 * 60 * 60 * 1000)
            : undefined,
      });

      // Populate the package before using it
      const populatedSubscription = await Subscription.findById(
        subscription._id
      )
        .populate<{ package: IPackage }>("package")
        .lean();

      if (!populatedSubscription) {
        throw new AppError(500, "Failed to create subscription");
      }

      // Update all existing usage records with new limits
      const usageTypes = ["analysis", "api_call", "storage"] as const;
      const period = {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      };

      // Get user's company if any
      const userCompany = await Company.findOne({ owner: userId }).lean();
      const companyId = userCompany?._id;

      for (const type of usageTypes) {
        let total = 0;
        if (type === "analysis") total = package_.features.maxAnalyses;
        else if (type === "api_call")
          total = 1000; // Default API call limit
        else if (type === "storage") total = 1000; // Default storage limit

        // Get current usage counts
        const currentUserUsage = await Usage.findOne({
          user: userId,
          type,
        }).lean();
        const currentCompanyUsage = companyId
          ? await Usage.findOne({ company: companyId, type }).lean()
          : null;

        const userCount = currentUserUsage?.count || 0;
        const companyCount = currentCompanyUsage?.count || 0;

        // Update or create usage records for both user and company
        const updatePromises = [
          // Update user usage
          Usage.findOneAndUpdate(
            { user: userId, type },
            {
              $set: {
                period,
                "limits.total": total,
                "limits.used": userCount,
                "limits.remaining": total - userCount,
              },
            },
            { upsert: true, new: true }
          ),
        ];

        // If user has a company, update company usage as well
        if (companyId) {
          updatePromises.push(
            Usage.findOneAndUpdate(
              { company: companyId, type },
              {
                $set: {
                  period,
                  "limits.total": total,
                  "limits.used": companyCount,
                  "limits.remaining": total - companyCount,
                },
              },
              { upsert: true, new: true }
            )
          );
        }

        await Promise.all(updatePromises);
      }

      return {
        subscription: populatedSubscription,
        message: "Subscription created successfully",
      };
    } catch (error) {
      console.error("Error in createSubscription:", error);
      throw new AppError(500, "Failed to create subscription");
    }
  }

  static async handleWebhook(event: any) {
    try {
      // For now, just log the event
      console.log("Webhook event received:", event);
      return { received: true };
    } catch (error) {
      throw new AppError(500, "Failed to handle webhook");
    }
  }

  static async updateSubscriptionStatus(
    subscriptionId: string,
    status: "trial" | "active" | "canceled" | "paused" | "expired"
  ) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) throw new AppError(404, "Subscription not found");

      subscription.status = status;
      await subscription.save();

      return subscription;
    } catch (error) {
      throw new AppError(500, "Failed to update subscription status");
    }
  }

  static async handleSuccessfulPayment(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(
        subscriptionId
      ).populate<{ package: { features: { maxAnalyses: number } } }>("package");

      if (!subscription) throw new AppError(404, "Subscription not found");

      // Reset usage for new billing period
      await Usage.updateOne(
        { user: subscription.user },
        {
          $set: {
            "limits.used": 0,
            "limits.remaining": subscription.package.features.maxAnalyses,
            "period.start": new Date(),
            "period.end": new Date(
              Date.now() +
                (subscription.billingCycle === "monthly" ? 30 : 365) *
                  24 *
                  60 *
                  60 *
                  1000
            ),
          },
        }
      );

      return { success: true };
    } catch (error) {
      throw new AppError(500, "Failed to handle successful payment");
    }
  }

  static async handleFailedPayment(subscriptionId: string) {
    try {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) throw new AppError(404, "Subscription not found");

      // Update subscription status
      subscription.status = "paused";
      await subscription.save();

      // TODO: Implement notification system
      return { success: true };
    } catch (error) {
      throw new AppError(500, "Failed to handle failed payment");
    }
  }

  static async createFreeTierSubscription(userId: string) {
    try {
      console.log("createFreeTierSubscription called with userId:", userId);
      // Get the free tier package
      const freePackage = await Package.findOne({ name: "Free" });
      console.log("Free package in createFreeTierSubscription:", freePackage);
      if (!freePackage) {
        throw new AppError(404, "Free tier package not found");
      }

      console.log("Creating subscription record...");
      // Create a free subscription
      const subscription = await Subscription.create({
        user: userId,
        package: freePackage._id,
        status: "active",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stripeSubscriptionId: `local_${Date.now()}`,
        stripeCustomerId: `local_${userId}`,
      });
      console.log("Created subscription record:", subscription);

      console.log("Creating usage records...");
      // Initialize usage tracking for all types
      const usageTypes = ["analysis", "api_call", "storage"] as const;
      const usageLimits = {
        analysis: { total: 2, used: 0, remaining: 2 },
        api_call: { total: 100, used: 0, remaining: 100 },
        storage: { total: 100, used: 0, remaining: 100 },
      };

      for (const type of usageTypes) {
        console.log(`Creating usage record for type: ${type}`);
        const usageRecord = await Usage.create({
          user: userId,
          type,
          period: {
            start: new Date(),
            end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
          limits: usageLimits[type],
          count: 0,
        });
        console.log(`Created usage record for ${type}:`, usageRecord);
      }

      console.log("Updating user with subscription reference...");
      // Update user with subscription reference
      await User.findByIdAndUpdate(userId, { subscription: subscription._id });

      console.log("Returning populated subscription...");
      // Return populated subscription
      const populatedSubscription = await Subscription.findById(
        subscription._id
      ).populate("package");

      console.log("Final populated subscription:", populatedSubscription);
      return populatedSubscription;
    } catch (error) {
      console.error("Error creating free tier subscription:", error);
      throw new AppError(500, "Failed to create free tier subscription");
    }
  }

  /**
   * Creates or resets usage records based on a subscription's package.
   * This should be called whenever a subscription is created or changed.
   */
  private static async upsertUsageForSubscription(subscription: ISubscription) {
    const { user, company, package: subPackage } = subscription;
    const features = (subPackage as IPackage).features;

    const usageTypes = ["analysis", "api_call", "storage"] as const;
    const period = {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };

    // First, delete any existing usage records for this user/company
    const usageIdentifier = company ? { company } : { user };
    await Usage.deleteMany(usageIdentifier);

    // Then create new usage records
    for (const type of usageTypes) {
      let total = 0;
      if (type === "analysis") total = features.maxAnalyses ?? 0;
      // Add more cases for other features if they exist in your package model

      await Usage.create({
        ...usageIdentifier,
        type,
        period,
        limits: {
          total,
          used: 0,
          remaining: total,
        },
      });
    }
  }
}
