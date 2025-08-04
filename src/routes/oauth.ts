import { Router } from "express";
import { OAuthController } from "../controllers/oauthController";
import { authenticate } from "../middleware/auth";

const router = Router();

// LinkedIn OAuth routes
router.get(
  "/linkedin/auth-url",
  authenticate,
  OAuthController.getLinkedInAuthUrl
);
router.get("/linkedin/callback", OAuthController.handleLinkedInCallback);

// Google OAuth routes
router.get("/google/auth-url", authenticate, OAuthController.getGoogleAuthUrl);
router.get("/google/callback", OAuthController.handleGoogleCallback);

// Medium OAuth routes - REMOVED (Medium API is deprecated)

// Platform management routes
router.get("/platforms", authenticate, OAuthController.getConnectedPlatforms);
router.delete(
  "/platforms/:platform",
  authenticate,
  OAuthController.disconnectPlatform
);
router.post(
  "/platforms/:platform/reconnect",
  authenticate,
  OAuthController.reconnectPlatform
);
router.get(
  "/platforms/:platform/token-info",
  authenticate,
  OAuthController.getTokenInfo
);

export const oauthRoutes = router;
