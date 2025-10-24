// routes/nearbyRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  findNearbyRiders, 
  findNearbyRidersByTrip, 
  getRiderLocation 
} from "../controllers/nearbyController.js";

const router = express.Router();

// Public routes (no authentication required for finding nearby riders)
router.get("/", findNearbyRiders);
router.get("/trip", findNearbyRidersByTrip);

// Protected routes
router.get("/rider/:sessionId", protect, getRiderLocation);

export default router;
