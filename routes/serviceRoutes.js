// routes/serviceRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createServiceReminder,
  getServiceHistory,
  logService,
  getUpcomingServices,
  getOverdueServices,
  getServiceReminders,
  updateServiceReminder,
  deleteServiceReminder,
  getServiceStats,
  rateService
} from "../controllers/serviceController.js";

const router = express.Router();

// All service routes are protected
router.post("/reminder", protect, createServiceReminder);
router.get("/history", protect, getServiceHistory);
router.post("/log", protect, logService);
router.get("/upcoming", protect, getUpcomingServices);
router.get("/overdue", protect, getOverdueServices);
router.get("/reminders", protect, getServiceReminders);
router.put("/reminder/:id", protect, updateServiceReminder);
router.delete("/reminder/:id", protect, deleteServiceReminder);
router.get("/stats", protect, getServiceStats);
router.post("/:id/rate", protect, rateService);

export default router;
