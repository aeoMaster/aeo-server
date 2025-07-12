import request from "supertest";
import express from "express";
import { healthRoutes } from "../health";

const app = express();
app.use("/health", healthRoutes);

describe("Health Routes", () => {
  describe("GET /health", () => {
    it("should return basic health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("environment");
    });
  });

  describe("GET /health/detailed", () => {
    it("should return detailed health information", async () => {
      const response = await request(app).get("/health/detailed");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "healthy");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("environment");
      expect(response.body).toHaveProperty("database");
      expect(response.body).toHaveProperty("memory");
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("GET /health/aws", () => {
    it("should return AWS health check response", async () => {
      const response = await request(app).get("/health/aws");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("timestamp");
    });
  });
});
