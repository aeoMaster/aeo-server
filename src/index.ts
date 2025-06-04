import express, { Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import { errorHandler } from "./middleware/errorHandler";
import { initializePassport } from "./config/passport";
import { seedPackages } from "./config/seedPackages";
import { authRoutes } from "./routes/auth";
import { analyzeRoutes } from "./routes/analyze";
import { settingsRoutes } from "./routes/settings";
import { subscriptionRoutes } from "./routes/subscription";
import { companyRoutes } from "./routes/company";
import { usageRoutes } from "./routes/usage";

// Load environment variables FIRST
dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Initialize Passport
initializePassport();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    // Seed packages after successful database connection
    seedPackages();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/usage", usageRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
