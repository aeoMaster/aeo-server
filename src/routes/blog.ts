import { Router } from "express";
import { BlogController } from "../controllers/blogController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes (no authentication required)
router.get("/public", BlogController.getPublicBlogs);
router.get("/public/:id", BlogController.getPublicBlogById);

// Protected routes (authentication required)
router.use(authenticate);

// Blog CRUD operations - Put specific routes before generic :id route
router.post("/", BlogController.createBlog);
router.get("/", BlogController.getBlogs);
router.get("/stats", BlogController.getBlogStats);

// Publishing operations - Put these before the generic :id route
router.post("/:id/publish", BlogController.publishBlog);
router.get("/:id/publish-status", BlogController.getPublishStatus);

// Platform operations
router.get("/platforms", BlogController.getConnectedPlatforms);

// Generic CRUD operations for specific blog ID
router.get("/:id", BlogController.getBlogById);
router.put("/:id", BlogController.updateBlog);
router.delete("/:id", BlogController.deleteBlog);

export const blogRoutes = router;
