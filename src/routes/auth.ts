import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, IUser } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { SubscriptionService } from "../services/subscriptionService";

const router = Router();

// Validation schemas
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

// Signup route
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(400, "Email already in use");
    }

    // Create new user
    const user = (await User.create({ name, email, password })) as IUser;

    if (!user._id) {
      throw new AppError(500, "User ID not found");
    }

    try {
      // Create free tier subscription and usage records
      await SubscriptionService.createFreeTierSubscription(user._id.toString());
    } catch (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      // Delete the user if subscription creation fails
      await User.findByIdAndDelete(user._id);
      throw new AppError(
        500,
        "Failed to create user subscription. Please try again."
      );
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.status(201).json({
      status: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login route
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user and check password
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError(401, "Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.json({
      status: "success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    console.log("req.user", req.user);
    const user = req.user as IUser;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

export const authRoutes = router;
