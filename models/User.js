// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  phone: { type: String },
  phoneVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  isIncomplete: { type: Boolean, default: false },
  bio: { type: String },
  avatar: { type: String }, // Cloudinary image later

  bikes: [{
    brand: { type: String },
    model: { type: String },
    numberPlate: { type: String },
    color: { type: String },
  }],

  totalTrips: { type: Number, default: 0 }, // total trips logged
  location: { type: String }, // current city or area

  // Friends system
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Pending friend requests (requests received but not yet accepted)
  pendingRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Sent friend requests (requests sent but not yet accepted)
  sentRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Privacy settings
  privacySettings: {
    showFriendsList: { type: Boolean, default: true },
    showMutualFriends: { type: Boolean, default: true },
    allowFriendRequests: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true }
  },

  // Notification settings
  notificationSettings: {
    // Push notification settings
    pushNotifications: {
      enabled: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      tripUpdates: { type: Boolean, default: true },
      postLikes: { type: Boolean, default: true },
      postComments: { type: Boolean, default: true },
      tripInvites: { type: Boolean, default: true },
      emergencyAlerts: { type: Boolean, default: true },
      nearbyRiders: { type: Boolean, default: false },
      achievements: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true },
      maintenanceReminders: { type: Boolean, default: true },
      weatherAlerts: { type: Boolean, default: true }
    },
    
    // Email notification settings
    emailNotifications: {
      enabled: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      tripUpdates: { type: Boolean, default: false },
      emergencyAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true }
    },
    
    // SMS notification settings
    smsNotifications: {
      enabled: { type: Boolean, default: false },
      emergencyAlerts: { type: Boolean, default: true },
      tripUpdates: { type: Boolean, default: false }
    },
    
    // Quiet hours
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: "22:00" }, // 10 PM
      endTime: { type: String, default: "08:00" },   // 8 AM
      timezone: { type: String, default: "UTC" }
    },
    
    // Device tokens for push notifications
    deviceTokens: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
      deviceId: String,
      lastUsed: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true }
    }]
  },

  // Achievements system
  achievements: {
    unlocked: [{
      achievement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement',
        required: true
      },
      unlockedAt: {
        type: Date,
        default: Date.now
      },
      progress: {
        type: Number,
        default: 100
      },
      level: {
        type: Number,
        default: 1
      }
    }],
    
    totalPoints: {
      type: Number,
      default: 0
    },
    
    level: {
      type: Number,
      default: 1
    },
    
    experience: {
      type: Number,
      default: 0
    },
    
    badges: [{
      name: String,
      icon: String,
      color: String,
      earnedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    titles: [{
      name: String,
      description: String,
      earnedAt: {
        type: Date,
        default: Date.now
      },
      isActive: {
        type: Boolean,
        default: false
      }
    }],
    
    streaks: {
      riding: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActivity: Date
      },
      posting: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActivity: Date
      }
    }
  }

}, { timestamps: true });

// Add search indexes
userSchema.index({ name: 'text', bio: 'text', location: 'text' });
userSchema.index({ location: 1 });
userSchema.index({ 'bikes.brand': 1 });
userSchema.index({ totalTrips: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);
export default User;
