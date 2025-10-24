// routes/analyticsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getUserStats,
  getTripStats,
  getRideHistory,
  getLeaderboard
} from "../controllers/analyticsController.js";

const router = express.Router();

// All analytics routes are protected
router.get("/user-stats", protect, getUserStats);
router.get("/trip-stats", protect, getTripStats);
router.get("/ride-history", protect, getRideHistory);
router.get("/leaderboard", protect, getLeaderboard);

export default router;
