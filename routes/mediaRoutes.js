// routes/mediaRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  uploadMedia,
  uploadMiddleware,
  deleteMedia,
  getUserMedia,
  getMediaById,
  updateMedia,
  getMediaStats,
  downloadMedia
} from "../controllers/mediaController.js";

const router = express.Router();

// All media routes are protected
router.post("/upload", protect, uploadMiddleware, uploadMedia);
router.delete("/:id", protect, deleteMedia);
router.get("/user/:userId", protect, getUserMedia);
router.get("/:id", protect, getMediaById);
router.put("/:id", protect, updateMedia);
router.get("/stats/me", protect, getMediaStats);
router.post("/:id/download", protect, downloadMedia);

export default router;
