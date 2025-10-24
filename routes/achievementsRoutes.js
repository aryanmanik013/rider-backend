// routes/achievementsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAchievements,
  unlockAchievement,
  getAchievementLeaderboard,
  getUserAchievementProgress
} from "../controllers/achievementsController.js";

const router = express.Router();

// All achievement routes are protected
router.get("/", protect, getAchievements);
router.post("/unlock/:achievementId", protect, unlockAchievement);
router.get("/leaderboard", protect, getAchievementLeaderboard);
router.get("/progress", protect, getUserAchievementProgress);

export default router;
