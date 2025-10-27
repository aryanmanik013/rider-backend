// routes/chatRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getConversations, sendMessage, getMessages } from "../controllers/chatController.js";

const router = express.Router();

// All chat routes are protected
router.route("/conversations").get(protect, getConversations);
router.route("/").post(protect, sendMessage);
router.route("/:tripId").get(protect, getMessages);

export default router;