// routes/eventsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createEvent,
  getEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  getNearbyEvents,
  rateEvent,
  getUserEvents
} from "../controllers/eventsController.js";

const router = express.Router();

// All event routes are protected
router.post("/", protect, createEvent);
router.get("/", protect, getEvents);
router.get("/nearby", protect, getNearbyEvents);
router.get("/user/:userId", protect, getUserEvents);
router.get("/:id", protect, getEventById);
router.post("/:id/join", protect, joinEvent);
router.post("/:id/leave", protect, leaveEvent);
router.post("/:id/rate", protect, rateEvent);

export default router;
