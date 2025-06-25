import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { Analysis } from "../models/Analysis";
import { analyzeHandler } from "../services/analyze/analyzeHandler";
import { AnalysisController } from "../controllers/analysisController";

const router = Router();

router.post("/", authenticate, analyzeHandler);

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

    console.log("analysis", analysis);

    if (!analysis) {
      throw new AppError(404, "Analysis not found");
    }

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

export const analyzeRoutes = router;
