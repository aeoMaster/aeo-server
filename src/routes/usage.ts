import { RequestHandler, Router } from "express";
import { UsageController } from "../controllers/usageController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Get all usage data
router.get("/", authenticate, UsageController.getUsage as RequestHandler);

// Get usage history
router.get(
  "/history",
  authenticate,
  UsageController.getUsageHistory as RequestHandler
);

// Track usage
router.post(
  "/track",
  authenticate,
  UsageController.trackUsage as RequestHandler
);

// Get current usage
router.get(
  "/current",
  authenticate,
  UsageController.getCurrentUsage as RequestHandler
);

export const usageRoutes = router;
