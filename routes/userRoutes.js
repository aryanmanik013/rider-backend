// routes/userRoutes.js
import express from "express";
import { getUserProfile, updateUserProfile, getMyProfile, updateMyProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes (authentication required) - MUST come before parameterized routes
router.get("/profile", protect, getMyProfile);
router.put("/profile", protect, updateMyProfile);
router.get("/me/profile", protect, getMyProfile);
router.put("/me/profile", protect, updateMyProfile);

// Public routes (no authentication required)
router.get("/:id", getUserProfile);

// Protected parameterized routes
router.put("/:id", protect, updateUserProfile);

export default router;
