// routes/paymentRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createPayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentById,
  processRefund,
  getPaymentStats
} from "../controllers/paymentController.js";

const router = express.Router();

// All payment routes are protected
router.post("/create", protect, createPayment);
router.post("/verify", protect, verifyPayment);
router.get("/history", protect, getPaymentHistory);
router.get("/:id", protect, getPaymentById);
router.post("/:id/refund", protect, processRefund);
router.get("/stats/me", protect, getPaymentStats);

export default router;
