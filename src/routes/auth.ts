import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User, IUser } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { SubscriptionService } from "../services/subscriptionService";
import { configService } from "../services/configService";

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

// Signup route (legacy auth only)
router.post("/signup", async (req, res, next) => {
  // Check if Cognito auth is enabled
  if (configService.isCognitoAuth()) {
    res.status(404).json({
      status: "error",
      message: "Local signup is disabled. Please use Cognito authentication.",
    });
    return;
  }
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(400, "Email already in use");
    }

    // Create new user
    const user = (await User.create({
      name,
      email,
      password,
      roles: ["user"],
      cognitoGroups: [],
    })) as IUser;

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

// Login route (legacy auth only)
router.post("/login", async (req, res, next) => {
  // Check if Cognito auth is enabled
  if (configService.isCognitoAuth()) {
    res.status(404).json({
      status: "error",
      message: "Local login is disabled. Please use Cognito authentication.",
    });
    return;
  }
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

// Google OAuth routes (legacy auth only)
router.get("/google", (req, res, next) => {
  // Check if Cognito auth is enabled
  if (configService.isCognitoAuth()) {
    res.status(404).json({
      status: "error",
      message: "Google OAuth is disabled. Please use Cognito authentication.",
    });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

router.get("/google/callback", (req, res, next) => {
  // Check if Cognito auth is enabled
  if (configService.isCognitoAuth()) {
    res.status(404).json({
      status: "error",
      message: "Google OAuth is disabled. Please use Cognito authentication.",
    });
    return;
  }
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent("Authentication failed")}`
      );
    }

    console.log("req.user", user);
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  })(req, res, next);
});

export const authRoutes = router;
