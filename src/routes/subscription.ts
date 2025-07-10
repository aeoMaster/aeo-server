import { Router } from "express";
import { SubscriptionController } from "../controllers/subscriptionController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Get subscription plans
router.get("/plans", SubscriptionController.getPlans);

// Get current subscription
router.get(
  "/current",
  authenticate,
  SubscriptionController.getCurrentSubscription
);

// Create subscription
router.post("/", authenticate, SubscriptionController.createSubscription);

// Handle webhooks
router.post("/webhook", SubscriptionController.handleWebhook);

// Update subscription status
router.put(
  "/:subscriptionId/status",
  authenticate,
  SubscriptionController.updateStatus
);

// Update subscription package (upgrade/downgrade)
router.put(
  "/:subscriptionId/package",
  authenticate,
  SubscriptionController.updatePackage
);

// Handle payment
router.post(
  "/:subscriptionId/payment",
  authenticate,
  SubscriptionController.handlePayment
);

export const subscriptionRoutes = router;
