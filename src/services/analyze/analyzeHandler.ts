import { Request, Response, NextFunction } from "express";
import { analyzeUrl } from "./analyzeUrl";
import { analyzeContent } from "./analyzeContent";
import { Analysis } from "../../models/Analysis";
import { UsageService } from "../usageService";
import { AnalyzeReportTransformer } from "./analyzeReportTransformer";

export async function analyzeHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUserId = (req.user as { _id: string })._id;
    const companyId =
      (req.user as any)?.company?._id || (req.user as any)?.company;
    const { type, content, ...rest } = req.body;

    console.log("🔍 Analysis creation started");
    console.log("User ID:", currentUserId);
    console.log("Company ID:", companyId);

    let result;
    let analysis;
    if (type === "url") {
      const { auditResult, auditParts } = await analyzeUrl(content, rest);
      result = auditResult;
      analysis = auditParts;

      // Debug logging
      console.log("🔍 AI Analysis Result:", JSON.stringify(result, null, 2));
      console.log("🔍 AI Analysis Keys:", Object.keys(result || {}));
      console.log(
        "🔍 Raw Metrics Sent to AI:",
        JSON.stringify(auditParts.metrics, null, 2)
      );
      console.log(
        "🔍 Crawler Access Sent to AI:",
        JSON.stringify(auditParts.crawler_access, null, 2)
      );
    } else {
      result = await analyzeContent(content, rest);
    }

    // Extract business analysis fields from the result
    const {
      keywords = { primary: [], secondary: [], longTail: [] },
      competitorAnalysis = { strengths: [], weaknesses: [] },
      targetAudience = { demographics: [], interests: [], painPoints: [] },
      contentGaps = [],
      improvements = [],
      feedback = "",
      sentiment = "neutral",
      score,
      category_scores,
      fixes,
    } = result || {};

    // Validate and normalize fixes data to match database schema
    const validatedFixes = (fixes || []).map((fix: any, index: number) => {
      // Ensure impact uses correct enum values
      let normalizedImpact = fix.impact;
      if (fix.impact === "medium") {
        normalizedImpact = "med";
        console.log(
          `🔄 Normalized impact from 'medium' to 'med' for fix ${index}`
        );
      } else if (!["high", "med", "low"].includes(fix.impact)) {
        normalizedImpact = "med"; // Default to medium if invalid
        console.log(
          `⚠️ Invalid impact value '${fix.impact}' for fix ${index}, defaulting to 'med'`
        );
      }

      // Ensure effort uses correct enum values
      let normalizedEffort = fix.effort;
      if (!["low", "medium", "high"].includes(fix.effort)) {
        normalizedEffort = "medium"; // Default to medium if invalid
        console.log(
          `⚠️ Invalid effort value '${fix.effort}' for fix ${index}, defaulting to 'medium'`
        );
      }

      return {
        ...fix,
        impact: normalizedImpact,
        effort: normalizedEffort,
        id: fix.id || `ai_fix_${index}`,
      };
    });

    console.log(`🔍 Processing ${validatedFixes.length} fixes for analysis`);

    const analysisData = {
      user: currentUserId,
      type,
      content: type === "content" ? content : undefined,
      url: type === "url" ? content : undefined,
      company: companyId,
      companyName: rest.company,
      section: rest.section,
      score: score || 0,
      category_scores: category_scores || {},
      fixes: validatedFixes,
      metrics: {
        readability: category_scores?.snippet_conciseness || 0,
        engagement: category_scores?.answer_upfront || 0,
        seo: category_scores?.structured_data || 0,
        conversion: category_scores?.e_e_a_t_signals || 0,
        brandVoice: category_scores?.speakable_ready || 0,
        contentDepth: category_scores?.freshness_meta || 0,
        originality: category_scores?.media_alt_caption || 0,
        technicalAccuracy: category_scores?.crawler_access || 0,
      },
      feedback,
      improvements,
      keywords,
      sentiment,
      contentGaps,
      competitorAnalysis,
      targetAudience,
      rawAnalysis: analysis,
    };

    const savedAnalysis = await Analysis.create(analysisData);

    console.log("✅ Analysis created with ID:", savedAnalysis._id);

    // Track usage for the analysis
    try {
      console.log("📊 Starting usage tracking...");
      console.log("Tracking usage for user:", currentUserId);
      console.log("Tracking usage for company:", companyId);

      const usageResult = await UsageService.trackUsage(
        currentUserId,
        companyId,
        "analysis",
        1
      );

      console.log("✅ Usage tracking successful:", usageResult);
    } catch (usageError: any) {
      console.error("❌ Failed to track analysis usage:", usageError);
      console.error("Usage error details:", {
        message: usageError.message,
        stack: usageError.stack,
      });
      // Don't fail the analysis creation if usage tracking fails
    }

    // Transform the analysis into the improved report format
    const transformedReport = AnalyzeReportTransformer.transform(savedAnalysis);

    // Return both the analysis ID and the transformed report with additional metadata
    res.json({
      success: true,
      analysisId: savedAnalysis._id,
      createdAt: savedAnalysis.createdAt,
      type: savedAnalysis.type,
      url: savedAnalysis.url,
      content: savedAnalysis.content,
      company: savedAnalysis.company,
      companyName: savedAnalysis.companyName,
      section: savedAnalysis.section,
      status: "completed",
      report: transformedReport,
    });
  } catch (error) {
    console.error("❌ Analysis creation failed:", error);
    next(error);
  }
}
