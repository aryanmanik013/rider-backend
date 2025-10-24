// routes/postsRoutes.js
import express from "express";
import { 
  createPost, 
  getPostDetails, 
  toggleLike, 
  addComment,
  deleteComment, 
  updatePost, 
  deletePost 
} from "../controllers/postsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/:id", getPostDetails);

// Protected routes (authentication required)
router.post("/", protect, createPost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/comment", protect, addComment);
router.delete("/:id/comment/:commentId", protect, deleteComment);
router.put("/:id", protect, updatePost);
router.delete("/:id", protect, deletePost);

export default router;
