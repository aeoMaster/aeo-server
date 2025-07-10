import { Request, Response, NextFunction } from "express";
import { analyzeUrl } from "./analyzeUrl";
import { analyzeContent } from "./analyzeContent";
import { Analysis } from "../../models/Analysis";
import { UsageService } from "../usageService";

export async function analyzeHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUserId = (req.user as { _id: string })._id;
    const companyId = (req.user as any)?.company?._id?.toString();
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
    } else {
      result = await analyzeContent(content, rest);
    }

    const savedAnalysis = await Analysis.create({
      user: currentUserId,
      type,
      content: type === "content" ? content : undefined,
      url: type === "url" ? content : undefined,
      company: rest.company,
      section: rest.section,
      result: result,
      rawAnalysis: analysis,
    });

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

    res.json(savedAnalysis);
  } catch (error) {
    console.error("❌ Analysis creation failed:", error);
    next(error);
  }
}
