// routes/searchRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  searchUsers,
  searchTrips,
  searchPosts,
  searchRoutes,
  globalSearch
} from "../controllers/searchController.js";

const router = express.Router();

// All search routes are protected
router.get("/users", protect, searchUsers);
router.get("/trips", protect, searchTrips);
router.get("/posts", protect, searchPosts);
router.get("/routes", protect, searchRoutes);
router.get("/", protect, globalSearch);

export default router;
