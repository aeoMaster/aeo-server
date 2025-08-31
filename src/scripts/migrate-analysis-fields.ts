import mongoose from "mongoose";
import { Analysis } from "../models/Analysis";
import dotenv from "dotenv";

dotenv.config();

async function migrateAnalysisFields() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find all analysis documents that don't have category_scores or fixes
    const analysesToUpdate = await Analysis.find({
      $or: [
        { category_scores: { $exists: false } },
        { fixes: { $exists: false } },
      ],
    });

    console.log(`📊 Found ${analysesToUpdate.length} analyses to update`);

    if (analysesToUpdate.length === 0) {
      console.log("✅ All analyses already have the new fields");
      return;
    }

    // Update each document with default values
    let updatedCount = 0;
    for (const analysis of analysesToUpdate) {
      const updateData: any = {};

      if (!analysis.category_scores) {
        updateData.category_scores = {
          structured_data: 0,
          speakable_ready: 0,
          snippet_conciseness: 0,
          crawler_access: 0,
          freshness_meta: 0,
          e_e_a_t_signals: 0,
          media_alt_caption: 0,
          hreflang_lang_meta: 0,
          answer_upfront: 0,
        };
      }

      if (!analysis.fixes) {
        updateData.fixes = [];
      }

      if (Object.keys(updateData).length > 0) {
        await Analysis.updateOne({ _id: analysis._id }, { $set: updateData });
        updatedCount++;
        console.log(`✅ Updated analysis ${analysis._id}`);
      }
    }

    console.log(`🎉 Migration completed! Updated ${updatedCount} analyses`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAnalysisFields();
}

export { migrateAnalysisFields };
