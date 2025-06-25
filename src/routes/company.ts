import { Router } from "express";
import { CompanyController } from "../controllers/companyController";
import { authenticate } from "../middleware/auth";
import { checkRole } from "../middleware/roleCheck";
import { checkUsage } from "../middleware/usageCheck";

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

// Update company settings
router.put("/settings", authenticate, CompanyController.updateCompanySettings);

// Send invitation via email
router.post(
  "/invite",
  authenticate,
  checkUsage("members"),
  CompanyController.sendInvitation
);

// Generate invitation link
router.post(
  "/invite/link",
  authenticate,
  checkUsage("members"),
  CompanyController.generateInvitationLink
);

// Accept invitation (for both email and link)
router.post("/invite/accept", CompanyController.acceptInvitation);

// Get pending invitations
router.get("/invites", authenticate, CompanyController.getPendingInvitations);

// Cancel invitation
router.delete(
  "/invite/:inviteId",
  authenticate,
  CompanyController.cancelInvitation
);

export const companyRoutes = router;
