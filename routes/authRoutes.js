
// routes/authRoutes.js
import express from "express";
import { registerUser, loginUser, sendOTP, verifyOTP, logoutUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);

export default router;
