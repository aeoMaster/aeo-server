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
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    if (user.status !== "active") {
      throw new AppError(401, "Account is inactive");
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      throw new AppError(401, "Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "7d",
    });

    // Set token as HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production
      sameSite: "lax", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: "/", // Available for all routes
    });

    res.json({
      status: "success",
      token, // Still return token in response for frontend flexibility
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

// Get current user route (legacy auth)
router.get("/me", (req, res, next) => {
  // Use JWT authentication - check both Authorization header and cookie
  let token = null;

  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  // If no Authorization header, check cookie
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError(401, "Not authenticated"));
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // Get user from database
    User.findById(decoded.id)
      .then((user) => {
        if (!user || user.status !== "active") {
          throw new AppError(401, "User not found or inactive");
        }

        res.json({
          status: "success",
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            roles: user.roles || [user.role],
            groups: user.cognitoGroups || [],
          },
        });
      })
      .catch((error) => {
        console.error("Get user error:", error);
        next(new AppError(401, "Not authenticated"));
      });
  } catch (error) {
    console.error("JWT verification error:", error);
    next(new AppError(401, "Invalid token"));
  }
});

// Logout route (legacy auth)
router.post("/logout", (_req, res) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.json({
    status: "success",
    message: "Logged out successfully",
  });
});

// Debug endpoint for local development - returns JSON instead of redirecting
router.get("/debug/login", (_req, res) => {
  res.json({
    status: "debug",
    message: "This is a debug endpoint for local development",
    note: "Use POST /api/auth/login for actual login",
    availableEndpoints: {
      login: "POST /api/auth/login",
      signup: "POST /api/auth/signup",
      me: "GET /api/auth/me",
      debug: "GET /api/auth/debug/login",
    },
  });
});

export const authRoutes = router;
