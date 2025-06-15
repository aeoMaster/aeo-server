import { Router } from "express";
import { SiteAnalysisController } from "../controllers/siteAnalysisController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Endpoint for the combined, bulk analysis
router.post("/analyze", authenticate, SiteAnalysisController.runBulkAnalysis);

// Individual tool endpoints
router.get("/performance", authenticate, SiteAnalysisController.getPerformance);
router.get("/sitemap", authenticate, SiteAnalysisController.getSitemap);
router.get("/robots", authenticate, SiteAnalysisController.getRobots);

export const siteAnalysisRoutes = router;
