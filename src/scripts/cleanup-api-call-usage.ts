import mongoose from "mongoose";
import { Usage } from "../models/Usage";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migration script to remove all api_call usage records from the database
 * Run this script once to clean up old data after removing api_call from the schema
 */
async function cleanupApiCallUsage() {
  try {
    console.log("🔄 Starting cleanup of api_call usage records...");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/aeo";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find all api_call usage records
    const apiCallRecords = await Usage.find({ type: "api_call" });
    console.log(`📊 Found ${apiCallRecords.length} api_call usage records`);

    if (apiCallRecords.length > 0) {
      // Delete all api_call records
      const result = await Usage.deleteMany({ type: "api_call" });
      console.log(`✅ Deleted ${result.deletedCount} api_call usage records`);
    } else {
      console.log("✅ No api_call records found - database is clean!");
    }

    // Verify cleanup
    const remainingRecords = await Usage.find({ type: "api_call" });
    if (remainingRecords.length === 0) {
      console.log("✅ Cleanup successful - no api_call records remain");
    } else {
      console.log(
        `⚠️  Warning: ${remainingRecords.length} api_call records still exist`
      );
    }

    // Show current usage types in database
    const usageTypes = await Usage.distinct("type");
    console.log("📋 Current usage types in database:", usageTypes);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the migration
cleanupApiCallUsage();
