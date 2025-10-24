// controllers/userController.js
import User from "../models/User.js";

// Get public user profile by ID
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(id).select("-password -otp -otpExpires -email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      bio: user.bio,
      avatar: user.avatar,
      bikes: user.bikes,
      totalTrips: user.totalTrips,
      location: user.location,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user profile fields
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, location, bikes } = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Validate bikes array if provided
    if (bikes && !Array.isArray(bikes)) {
      return res.status(400).json({ message: "Bikes must be an array" });
    }

    // Validate each bike object
    if (bikes) {
      for (let i = 0; i < bikes.length; i++) {
        const bike = bikes[i];
        if (!bike.brand || !bike.model) {
          return res.status(400).json({ 
            message: `Bike at index ${i} must have brand and model` 
          });
        }
      }
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (bikes !== undefined) user.bikes = bikes;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        bio: user.bio,
        avatar: user.avatar,
        bikes: user.bikes,
        totalTrips: user.totalTrips,
        location: user.location,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current user's own profile (authenticated)
export const getMyProfile = async (req, res) => {
  try {
    const user = req.user; // From auth middleware

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      bio: user.bio,
      avatar: user.avatar,
      bikes: user.bikes,
      totalTrips: user.totalTrips,
      location: user.location,
      isIncomplete: user.isIncomplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update current user's own profile (authenticated)
export const updateMyProfile = async (req, res) => {
  try {
    const user = req.user; // From auth middleware
    const { bio, location, bikes } = req.body;

    // Validate bikes array if provided
    if (bikes && !Array.isArray(bikes)) {
      return res.status(400).json({ message: "Bikes must be an array" });
    }

    // Validate each bike object
    if (bikes) {
      for (let i = 0; i < bikes.length; i++) {
        const bike = bikes[i];
        if (!bike.brand || !bike.model) {
          return res.status(400).json({ 
            message: `Bike at index ${i} must have brand and model` 
          });
        }
      }
    }

    // Update fields
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (bikes !== undefined) user.bikes = bikes;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        bio: user.bio,
        avatar: user.avatar,
        bikes: user.bikes,
        totalTrips: user.totalTrips,
        location: user.location,
        isIncomplete: user.isIncomplete,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
