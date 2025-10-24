// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateOTP, getOTPExpiration, isOTPExpired, validatePhoneNumber } from "../utils/otp.js";
import { sendOTPSMS } from "../utils/sms.js";

// Set of invalidated tokens (Note: In production, use Redis or a database)
const invalidatedTokens = new Set();

// Helper: Create JWT token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Helper: Invalidate a token
const invalidateToken = (token) => {
  invalidatedTokens.add(token);
  // Optional: Clean up expired tokens periodically
  if (invalidatedTokens.size > 1000) {
    // Clean up logic here
    console.log("Token blacklist cleanup needed");
  }
};

// Register new user (rider)
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, bio, bikes } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Please provide name, email and password" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashed,
      phone,
      bio,
      bikes: bikes || []
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      bikes: user.bikes,
      token: createToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login existing user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Please provide email and password" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      bikes: user.bikes,
      token: createToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Logout user
export const logoutUser = async (req, res) => {
  try {
    // Get the token from the authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      // Add the token to invalidated tokens set
      invalidateToken(token);
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send OTP to phone number
export const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const otp = generateOTP();
    const otpExpires = getOTPExpiration();

    // Check if user exists with this phone
    let user = await User.findOne({ phone });
    
    if (user) {
      // Update existing user's OTP
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      // Create temporary user record for OTP verification
      user = await User.create({
        phone,
        otp,
        otpExpires,
        name: "Temp User", // Will be updated after OTP verification
        email: `temp_${phone}@temp.com`, // Temporary email
        password: "temp_password" // Will be updated after OTP verification
      });
    }

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(phone, otp);
    
    if (!smsResult.success) {
      console.log(`SMS failed, OTP for ${phone}: ${otp}`); // Fallback for development
      return res.status(500).json({ 
        message: "Failed to send SMS", 
        error: smsResult.error,
        fallbackOTP: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }

    res.json({
      message: "OTP sent successfully",
      phone: phone,
      expiresIn: "5 minutes",
      messageId: smsResult.messageId
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Verify OTP for phone login or signup
export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: "No OTP found for this phone number" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ message: "No OTP found for this phone number" });
    }

    if (isOTPExpired(user.otpExpires)) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    user.phoneVerified = true;

    // If this is a temporary user (signup), mark them as verified but incomplete
    if (user.email.includes('temp_') && user.password === 'temp_password') {
      user.isIncomplete = true;
    }

    await user.save();

    // Generate JWT token
    const token = createToken(user._id);

    res.json({
      message: "OTP verified successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        bio: user.bio,
        bikes: user.bikes,
        isIncomplete: user.isIncomplete || false
      },
      token
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
