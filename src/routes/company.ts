import { Router } from "express";
import { CompanyController } from "../controllers/companyController";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/roleCheck";

const router = Router();

// Get company details
router.get("/", authenticate, CompanyController.getCompany);

// Create new company
router.post("/", authenticate, CompanyController.createCompany);

// Update company
router.put(
  "/",
  authenticate,
  checkRole(["admin"]),
  CompanyController.updateCompany
);

// Get company users
router.get("/users", authenticate, CompanyController.getCompanyUsers);

// Add user to company
router.post(
  "/users",
  authenticate,
  checkRole(["admin"]),
  CompanyController.addUserToCompany
);

// Remove user from company
router.delete(
  "/users/:userId",
  authenticate,
  checkRole(["admin"]),
  CompanyController.removeUserFromCompany
);

export const companyRoutes = router;
