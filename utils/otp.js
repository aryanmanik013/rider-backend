// utils/otp.js
import crypto from "crypto";

// Generate a 4-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(1000, 9999).toString();
};

// Generate OTP expiration time (5 minutes from now)
export const getOTPExpiration = () => {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

// Check if OTP is expired
export const isOTPExpired = (otpExpires) => {
  return new Date() > new Date(otpExpires);
};

// Validate phone number format (basic validation)
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
  return phoneRegex.test(phone);
};
