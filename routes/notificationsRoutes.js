// routes/notificationsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  dismissNotification,
  getNotificationSettings,
  updateNotificationSettings,
  sendPushNotification,
  getNotificationStats,
  deleteNotification
} from "../controllers/notificationsController.js";

const router = express.Router();

// All notification routes are protected
router.get("/", protect, getNotifications);
router.get("/stats", protect, getNotificationStats);
router.get("/settings", protect, getNotificationSettings);
router.put("/settings", protect, updateNotificationSettings);
router.post("/mark-read/:id", protect, markNotificationAsRead);
router.post("/mark-all-read", protect, markAllAsRead);
router.post("/dismiss/:id", protect, dismissNotification);
router.delete("/:id", protect, deleteNotification);
router.post("/send-push", protect, sendPushNotification);

export default router;
