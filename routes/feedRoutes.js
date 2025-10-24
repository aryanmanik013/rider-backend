// routes/feedRoutes.js
import express from "express";
import { getCommunityFeed, getTrendingPosts, getUserPosts } from "../controllers/feedController.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/", getCommunityFeed);
router.get("/trending", getTrendingPosts);
router.get("/user/:userId", getUserPosts);

export default router;
