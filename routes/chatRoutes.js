// routes/chatRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getConversations,
  getDirectConversation,
  createGroupConversation,
  sendMessage,
  getConversationMessages,
  editMessage,
  deleteMessage,
  markConversationRead,
  addParticipant,
  removeParticipant
} from "../controllers/chatController.js";

const router = express.Router();

// All chat routes are protected

// Specific routes first (before dynamic routes)

// Get all conversations
router.get("/conversations", protect, getConversations);

// Get messages for a conversation (using conversations path)
router.get("/conversations/:id/messages", protect, getConversationMessages);

// Direct conversation
router.get("/direct/:userId", protect, getDirectConversation);

// Group conversation
router.post("/group", protect, createGroupConversation);

// Send message
router.post("/", protect, sendMessage);

// Edit message
router.put("/messages/:messageId/edit", protect, editMessage);

// Delete message
router.delete("/messages/:messageId/delete", protect, deleteMessage);

// Dynamic routes (must come after specific routes)
router.get("/:conversationId/messages", protect, getConversationMessages);
router.put("/:conversationId/read", protect, markConversationRead);
router.post("/:conversationId/participants", protect, addParticipant);
router.delete("/:conversationId/participants", protect, removeParticipant);

export default router;
