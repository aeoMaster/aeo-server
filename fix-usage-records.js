const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import models
const Subscription = require("./src/models/Subscription");
const Usage = require("./src/models/Usage");
const Package = require("./src/models/Package");
const User = require("./src/models/User");
const Company = require("./src/models/Company");

async function fixUsageRecords() {
  try {
    console.log("🔧 Starting usage records fix...\n");

    // Get all active subscriptions
    const subscriptions = await Subscription.find({
      status: { $in: ["active", "trial"] },
    }).populate("package");

    console.log(`📊 Found ${subscriptions.length} active subscriptions`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const subscription of subscriptions) {
      console.log(
        `\n🔍 Processing subscription for user: ${subscription.user}`
      );

      const package_ = subscription.package;
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
      ];

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
          user: subscription.user,
          company: companyId,
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
          const newUsage = await Usage.create({
            user: subscription.user,
            company: companyId,
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
