// routes/subscriptionRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  upgradeSubscription,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getAvailablePlans,
  checkUsageLimits,
  getSubscriptionHistory
} from "../controllers/subscriptionController.js";

const router = express.Router();

// All subscription routes are protected
router.post("/upgrade", protect, upgradeSubscription);
router.get("/", protect, getSubscription);
router.post("/cancel", protect, cancelSubscription);
router.post("/reactivate", protect, reactivateSubscription);
router.get("/plans", protect, getAvailablePlans);
router.get("/limits", protect, checkUsageLimits);
router.get("/history", protect, getSubscriptionHistory);

export default router;
