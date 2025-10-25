// routes/reelsRoutes.js
import express from "express";
import multer from "multer";
import { 
  createReel,
  createReelWithLink,
  getReelFeed,
  getTrendingReels,
  getReelDetails,
  toggleLike,
  toggleSave,
  addComment,
  getReelsByHashtag,
  getUserReels,
  deleteReel,
  searchReels
} from "../controllers/reelsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Public routes
router.get("/feed", protect, getReelFeed);
router.get("/trending", protect, getTrendingReels);
router.get("/search", protect, searchReels);
router.get("/hashtag/:hashtag", protect, getReelsByHashtag);
router.get("/user/:userId", protect, getUserReels);
router.get("/:id", protect, getReelDetails);

// Protected routes (authentication required)
router.post("/", protect, upload.single('video'), createReel);
router.post("/with-link", protect, createReelWithLink);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/save", protect, toggleSave);
router.post("/:id/comment", protect, addComment);
router.delete("/:id", protect, deleteReel);

export default router;
