import { Router } from "express";
import mongoose from "mongoose";
import { configService } from "../services/configService";

const router = Router();

// Basic health check endpoint
router.get("/", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Detailed health check with database and Cognito status
router.get("/detailed", async (_req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // Test Cognito connectivity if using Cognito auth
    let cognitoStatus = null;
    if (configService.isCognitoAuth()) {
      try {
        const endpoints = configService.getCognitoEndpoints();

        // Test JWKS endpoint
        const jwksResponse = await fetch(endpoints.jwks, { method: "HEAD" });
        const jwksReachable = jwksResponse.ok;

        // Test token endpoint
        const tokenResponse = await fetch(endpoints.token, { method: "HEAD" });
        const tokenReachable = tokenResponse.ok;

        cognitoStatus = {
          reachable: jwksReachable && tokenReachable,
          jwks: jwksReachable ? "reachable" : "unreachable",
          token: tokenReachable ? "reachable" : "unreachable",
        };
      } catch (error) {
        cognitoStatus = {
          reachable: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbStatus,
        readyState: mongoose.connection.readyState,
      },
      cognito: cognitoStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
      version: process.version,
      authProvider: configService.get("AUTH_PROVIDER"),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// AWS Elastic Beanstalk health check endpoint
router.get("/aws", (_req, res) => {
  // This endpoint is specifically for AWS Elastic Beanstalk health checks
  // It should be lightweight and respond quickly
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRoutes };
