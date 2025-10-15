import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/debug/version
 * Returns deployment information for debugging
 */
router.get("/version", (_req: Request, res: Response) => {
  res.json({
    status: "success",
    deployment: {
      timestamp: new Date().toISOString(),
      hasOAuthDebugLogging: true,
      hasTrustProxy: true,
      nodeEnv: process.env.NODE_ENV,
      version: "debug-oauth-v1",
    },
  });
});

/**
 * GET /api/debug/trust-proxy
 * Tests if trust proxy is working
 */
router.get("/trust-proxy", (req: Request, res: Response) => {
  res.json({
    status: "success",
    trustProxy: {
      enabled: req.app.get("trust proxy"),
      ip: req.ip,
      ips: req.ips,
      xForwardedFor: req.get("X-Forwarded-For"),
      xRealIp: req.get("X-Real-IP"),
    },
  });
});

export { router as debugRoutes };
