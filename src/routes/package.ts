import { Router } from "express";
import { PackageController } from "../controllers/packageController";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/roleCheck";

const router = Router();

// Public route to list packages for pricing pages, etc.
router.get("/", PackageController.list);

// Admin-only routes for package management.
// Note: 'admin' role is used here. You may want a more specific 'platform-admin' role for security.
router.post("/", authenticate, checkRole(["admin"]), PackageController.create);

router.put(
  "/:name",
  authenticate,
  checkRole(["admin"]),
  PackageController.update
);

router.delete(
  "/:name",
  authenticate,
  checkRole(["admin"]),
  PackageController.remove
);

export const packageRoutes = router;
