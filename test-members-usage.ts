import mongoose from "mongoose";
import { User } from "./src/models/User";
import { Company } from "./src/models/Company";
import { UsageService } from "./src/services/usageService";
import dotenv from "dotenv";

dotenv.config();

/**
 * Test script to verify members usage tracking
 * This will help debug why members is not showing in the usage response
 */
async function testMembersUsage() {
  try {
    console.log("🔍 Testing members usage tracking...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/aeo";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Get the first user with their company info
    const user = await User.findOne().populate("company").lean();

    if (!user) {
      console.log("❌ No users found in database");
      await mongoose.disconnect();
      return;
    }

    console.log("👤 User Info:");
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Company: ${user.company ? "Yes" : "No"}\n`);

    if (user.company) {
      const companyId =
        typeof user.company === "object" ? user.company._id : user.company;
      const company = await Company.findById(companyId).lean();

      if (company) {
        console.log("🏢 Company Info:");
        console.log(`   ID: ${company._id}`);
        console.log(`   Name: ${company.name}`);
        console.log(`   Owner: ${company.owner}`);
        console.log(
          `   Is Owner: ${company.owner.toString() === user._id.toString() ? "Yes" : "No"}\n`
        );

        // Count members
        const memberCount = await User.countDocuments({ company: companyId });
        console.log(`👥 Members Count: ${memberCount}\n`);

        // Get usage with companyId
        console.log("📊 Testing getCurrentUsage with companyId...");
        const usage = await UsageService.getCurrentUsage(
          user._id.toString(),
          companyId.toString()
        );

        console.log("\n📈 Usage Response:");
        console.log(JSON.stringify(usage, null, 2));

        if (usage.members) {
          console.log("\n✅ SUCCESS: Members tracking is working!");
        } else {
          console.log(
            "\n❌ ISSUE: Members field is missing from usage response"
          );
          console.log("   This might be because:");
          console.log("   1. User is not the company owner");
          console.log("   2. Company has no active subscription");
        }
      }
    } else {
      console.log("ℹ️  User has no company - testing individual usage...");
      const usage = await UsageService.getCurrentUsage(user._id.toString());

      console.log("\n📈 Usage Response:");
      console.log(JSON.stringify(usage, null, 2));
      console.log("\n✅ For individual users, members field is not expected");
    }

    await mongoose.disconnect();
    console.log("\n✅ Test completed");
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

// Run the test
testMembersUsage();
