// routes/friendsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendsList,
  getMutualFriends,
  getFriendSuggestions,
  updatePrivacySettings,
  cancelFriendRequest
} from "../controllers/friendsController.js";

const router = express.Router();

// All friends routes are protected
router.post("/request/:userId", protect, sendFriendRequest);
router.post("/accept/:userId", protect, acceptFriendRequest);
router.post("/reject/:userId", protect, rejectFriendRequest);
router.post("/cancel/:userId", protect, cancelFriendRequest);
router.delete("/remove/:userId", protect, removeFriend);
router.get("/list/:userId", protect, getFriendsList);
router.get("/mutual/:userId", protect, getMutualFriends);
router.get("/suggestions", protect, getFriendSuggestions);
router.put("/privacy", protect, updatePrivacySettings);

export default router;
