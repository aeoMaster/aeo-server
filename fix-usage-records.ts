import mongoose from "mongoose";
import dotenv from "dotenv";
import { IPackage } from "./src/models/Package";

dotenv.config();

// Require all models for side-effect registration
require("./src/models/Package");
require("./src/models/Subscription");
require("./src/models/Usage");
require("./src/models/User");
require("./src/models/Company");

const Subscription = mongoose.model("Subscription");
const Usage = mongoose.model("Usage");
const User = mongoose.model("User");
const Company = mongoose.model("Company");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

async function fixUsageRecords() {
  try {
    console.log("🔧 Starting usage records fix...\n");

    // Get all active subscriptions
    const subscriptions = await Subscription.find({
      status: { $in: ["active", "trial"] },
    }).populate<{ package: IPackage }>("package");

    console.log(`📊 Found ${subscriptions.length} active subscriptions`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const subscription of subscriptions) {
      console.log(
        `\n🔍 Processing subscription for user: ${subscription.user}`
      );

      const package_ = subscription.package as IPackage;
      if (!package_) {
        console.log(`❌ No package found for subscription ${subscription._id}`);
        continue;
      }

      // Calculate period end date
      const periodEnd = new Date(subscription.currentPeriodEnd);

      // Get user's company if any
      const user = await User.findById(subscription.user);
      const company = user?.company
        ? await Company.findById(user.company)
        : null;
      const companyId = company?._id;

      // Determine owner: user or company (never both)
      let usageOwner: { user?: any; company?: any } = {};
      if (companyId) {
        usageOwner = { company: companyId };
      } else if (subscription.user) {
        usageOwner = { user: subscription.user };
      }

      console.log(`   User: ${subscription.user}`);
      console.log(`   Company: ${companyId || "None"}`);
      console.log(`   Package: ${package_.name}`);
      console.log(`   Period end: ${periodEnd}`);

      // Define all usage types
      const usageTypes = [
        "analysis",
        "clarity_scan",
        "chat_message",
        "api_call",
        "storage",
      ] as const;

      for (const type of usageTypes) {
        // Calculate total limit based on package features
        let total = 0;
        switch (type) {
          case "analysis":
            total = package_.features.maxAnalyses ?? 0;
            break;
          case "clarity_scan":
            total = package_.features.maxClarityScans ?? 0;
            break;
          case "chat_message":
            total = package_.features.maxChatMessages ?? 0;
            break;
          case "api_call":
            total = 1000; // Default API call limit
            break;
          case "storage":
            total = 1000; // Default storage limit
            break;
        }

        // Check if usage record exists for this type
        const existingUsage = await Usage.findOne({
          ...usageOwner,
          type: type,
          "period.end": { $gt: new Date() },
        });

        if (existingUsage) {
          console.log(
            `   ✅ ${type}: Record exists (${existingUsage.limits.used}/${existingUsage.limits.total})`
          );
          updatedCount++;
        } else {
          // Create new usage record
          await Usage.create({
            ...usageOwner,
            type: type,
            period: {
              start: subscription.currentPeriodStart,
              end: periodEnd,
            },
            limits: {
              total: total,
              used: 0,
              remaining: total,
            },
            count: 0,
          });

          console.log(`   ✅ ${type}: Created new record (0/${total})`);
          createdCount++;
        }
      }
    }

    console.log(`\n🎉 Fix completed!`);
    console.log(`   Created: ${createdCount} new usage records`);
    console.log(`   Updated: ${updatedCount} existing records`);
    console.log(`   Total processed: ${subscriptions.length} subscriptions`);
  } catch (error) {
    console.error("❌ Error fixing usage records:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the fix
fixUsageRecords();
