import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { UserSettings } from "../models/UserSettings";

const router = Router();

// Validation schema
const settingsSchema = z.object({
  notifications: z.boolean(),
  darkMode: z.boolean(),
  language: z.string(),
});

// Get user settings
router.get("/", authenticate, async (req, res, next) => {
  try {
    let settings = await UserSettings.findOne({ user: req.user?._id });

    if (!settings) {
      // Create default settings if none exist
      settings = await UserSettings.create({
        user: req.user?._id,
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update user settings
router.put("/", authenticate, async (req, res, next) => {
  try {
    const { notifications, darkMode, language } = settingsSchema.parse(
      req.body
    );

    const settings = await UserSettings.findOneAndUpdate(
      { user: req.user?._id },
      {
        notifications,
        darkMode,
        language,
      },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

export const settingsRoutes = router;
