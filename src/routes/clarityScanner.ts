import { Router } from "express";
import { ClarityScannerController } from "../controllers/clarityScannerController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes (no authentication required)
router.get("/scan", ClarityScannerController.scanUrl);
router.get("/scan/:id", ClarityScannerController.getScanById);

// Protected routes (authentication required)
router.use(authenticate);

// Scan history and management
router.get("/history", ClarityScannerController.getScanHistory);
router.get("/scan/:id/html", ClarityScannerController.getScanWithHtml);
router.delete("/scan/:id", ClarityScannerController.deleteScan);

export const clarityScannerRoutes = router;
