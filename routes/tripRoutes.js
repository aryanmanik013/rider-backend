// routes/tripRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createTrip, getTrips, getTripDetails, joinTrip } from "../controllers/tripController.js";

const router = express.Router();

// Public routes
router.get("/", getTrips);

// Protected routes
router.post("/", protect, createTrip);
router.get("/:id", getTripDetails);
router.post("/:id/join", protect, joinTrip);

export default router;