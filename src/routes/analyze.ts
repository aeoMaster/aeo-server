import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { Analysis } from "../models/Analysis";
import axios from "axios";
import { AnalysisController } from "../controllers/analysisController";

const router = Router();

const getOpenAI = (): OpenAI => {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError(500, "OpenAI API key is not configured");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// Validation schema
const analyzeSchema = z.object({
  content: z.string().min(10, "Content must be at least 10 characters long"),
  type: z.enum(["content", "url"]),
  company: z.string().optional(),
  section: z.string().optional(),
});

// Helper function to estimate tokens (roughly 4 characters per token)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Helper function to truncate text to max tokens
const truncateToMaxTokens = (text: string, maxTokens: number = 800): string => {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;

  // Calculate how many characters to keep (roughly 4 chars per token)
  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars);
};

// Analysis route
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { content, type, company, section } = analyzeSchema.parse(req.body);
    const openai = getOpenAI();
    const currentUserId = (req.user as { _id: string })._id;

    let contentToAnalyze = content;
    if (type === "url") {
      try {
        const response = await axios.get(content);
        contentToAnalyze = response.data;
      } catch (error) {
        throw new AppError(400, "Failed to fetch URL content");
      }
    }

    // Truncate content to max tokens
    contentToAnalyze = truncateToMaxTokens(contentToAnalyze);

    // Prepare prompt based on analysis type
    const prompt = `Analyze the following content for quality and effectiveness: ${contentToAnalyze}`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert marketing content analyst and strategist.Analyze the provided content across marketing effectiveness, SEO, emotional tone, structure, originality, and audience fit. Return ONLY a valid JSON object with the following structure: { score: number, feedback: string, improvements: string[], metrics: { readability: number, engagement: number, seo: number, conversion: number, brandVoice: number, contentDepth: number, originality: number, technicalAccuracy: number }, keywords: { primary: string[], secondary: string[], longTail: string[] }, sentiment: 'positive' | 'neutral' | 'negative', contentGaps: string[], competitorAnalysis: { strengths: string[], weaknesses: string[] }, roiMetrics: { potentialReach: number, engagementRate: number, conversionProbability: number }, contentStructure: { headings: number, paragraphs: number, images: number, links: number }, targetAudience: { demographics: string[], interests: string[], painPoints: string[] } }",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800, // Limit response tokens as well
    });

    // Parse and structure the response
    const analysis = response.choices[0]?.message?.content;
    if (!analysis) {
      throw new AppError(500, "Failed to analyze content");
    }

    let result;
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedAnalysis = analysis
        .trim()
        .replace(/^```json\s*|\s*```$/g, "");
      result = JSON.parse(cleanedAnalysis);
    } catch (error) {
      console.error("Failed to parse OpenAI response:", analysis);
      throw new AppError(500, "Failed to parse analysis response");
    }

    // Save analysis to database
    const savedAnalysis = await Analysis.create({
      user: currentUserId,
      type,
      content: type === "content" ? content : undefined,
      url: type === "url" ? content : undefined,
      company,
      section,
      ...result,
      rawAnalysis: analysis,
    });

    res.json(savedAnalysis);
  } catch (error) {
    next(error);
  }
});

// Get analysis history
router.get("/history", authenticate, AnalysisController.getHistory);

// Get single analysis
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { _id: string })._id;
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

export const analyzeRoutes = router;
