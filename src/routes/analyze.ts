import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { checkUsage } from "../middleware/usageCheck";
import { Analysis } from "../models/Analysis";
import { analyzeHandler } from "../services/analyze/analyzeHandler";
import { AnalysisController } from "../controllers/analysisController";
import { AnalyzeReportTransformer } from "../services/analyze/analyzeReportTransformer";

const router = Router();

router.post("/", authenticate, checkUsage("analysis"), analyzeHandler);

// Get analysis history
router.get("/history", authenticate, AnalysisController.getHistory);

// Get all analyses for a specific URL
router.get("/url/:url", authenticate, AnalysisController.getAnalysesForUrl);

// // Get single analysis
// router.get("/:id", authenticate, async (req, res, next) => {
//   try {
//     const userId = (req.user as { _id: string })._id;
//     const analysis = await Analysis.findOne({
//       _id: req.params.id,
//       user: userId,
//     });

//     if (!analysis) {
//       throw new AppError(404, "Analysis not found");
//     }

//     res.json(analysis);
//   } catch (error) {
//     next(error);
//   }
// });

// Get raw analysis data
router.get("/:id/raw", authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { _id: string })._id;
    const analysisId = req.params.id;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      user: userId,
    });

    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    res.json({
      success: true,
      analysis: analysis,
    });
  } catch (error) {
    next(error);
  }
});

// Get transformed analysis report
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const userId = (req.user as { _id: string })._id;
    const analysisId = req.params.id;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      user: userId,
    });

    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    const transformedReport = AnalyzeReportTransformer.transform(analysis);
    res.json(transformedReport);
  } catch (error) {
    next(error);
  }
});

export const analyzeRoutes = router;
