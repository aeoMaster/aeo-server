import { Router } from "express";
import { ClarityScannerController } from "../controllers/clarityScannerController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes (no authentication required)
router.get("/scan", ClarityScannerController.scanUrl);
router.get("/scan/:id", ClarityScannerController.getScanById);
router.get("/history", ClarityScannerController.getScanHistory);
router.get("/url/:url", ClarityScannerController.getScansForUrl);

// Protected routes (authentication required)
router.use(authenticate);

// Scan management (requires authentication)
router.get("/scan/:id/html", ClarityScannerController.getScanWithHtml);
router.delete("/scan/:id", ClarityScannerController.deleteScan);

export const clarityScannerRoutes = router;
