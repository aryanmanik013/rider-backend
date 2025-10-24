// routes/trackingRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  startTracking, 
  updateLocation, 
  sendLocationPoint,
  pauseTracking, 
  resumeTracking, 
  endTracking,
  stopTracking,
  getTrackingSession 
} from "../controllers/trackingController.js";

const router = express.Router();

// All tracking routes are protected
router.post("/start", protect, startTracking);
router.post("/point", protect, sendLocationPoint);
router.post("/stop", protect, stopTracking);
router.post("/:sessionId/location", protect, updateLocation);
router.post("/:sessionId/pause", protect, pauseTracking);
router.post("/:sessionId/resume", protect, resumeTracking);
router.post("/:sessionId/end", protect, endTracking);
router.get("/:sessionId", protect, getTrackingSession);

export default router;
