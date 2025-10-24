// models/Achievement.js
import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema({
  // Achievement details
  name: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Achievement category
  category: {
    type: String,
    enum: [
      'distance',
      'speed',
      'trips',
      'social',
      'posts',
      'safety',
      'exploration',
      'community',
      'milestone',
      'special'
    ],
    required: true
  },
  
  // Achievement type
  type: {
    type: String,
    enum: [
      'single',      // One-time achievement
      'progressive', // Multiple levels
      'recurring'    // Can be earned multiple times
    ],
    default: 'single'
  },
  
  // Achievement rarity
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  
  // Achievement requirements
  requirements: {
    // For distance achievements
    distance: {
      type: Number,
      required: false
    },
    
    // For speed achievements
    speed: {
      type: Number,
      required: false
    },
    
    // For trip achievements
    trips: {
      type: Number,
      required: false
    },
    
    // For social achievements
    friends: {
      type: Number,
      required: false
    },
    
    // For post achievements
    posts: {
      type: Number,
      required: false
    },
    
    // For likes/engagement
    likes: {
      type: Number,
      required: false
    },
    
    // For comments
    comments: {
      type: Number,
      required: false
    },
    
    // For consecutive days
    consecutiveDays: {
      type: Number,
      required: false
    },
    
    // For specific locations
    locations: [{
      name: String,
      lat: Number,
      lng: Number,
      radius: Number // in km
    }],
    
    // For specific bike brands
    bikeBrands: [String],
    
    // For specific trip types
    tripTypes: [String],
    
    // For specific difficulties
    difficulties: [String],
    
    // Custom conditions
    customConditions: mongoose.Schema.Types.Mixed
  },
  
  // Achievement rewards
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    
    badge: {
      name: String,
      icon: String,
      color: String
    },
    
    title: String, // Special title for user profile
    
    perks: [{
      type: String,
      description: String,
      value: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Achievement metadata
  icon: {
    type: String,
    required: true
  },
  
  color: {
    type: String,
    default: '#4CAF50'
  },
  
  // Achievement status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Achievement visibility
  isHidden: {
    type: Boolean,
    default: false
  },
  
  // Achievement unlock date
  unlockDate: {
    type: Date,
    default: null
  },
  
  // Achievement expiration
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Achievement prerequisites
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  
  // Achievement tags
  tags: [String],
  
  // Achievement statistics
  stats: {
    totalUnlocked: {
      type: Number,
      default: 0
    },
    
    unlockRate: {
      type: Number,
      default: 0
    },
    
    averageUnlockTime: {
      type: Number,
      default: 0
    }
  }

}, {
  timestamps: true
});

// Indexes for better performance
achievementSchema.index({ category: 1, rarity: 1 });
achievementSchema.index({ isActive: 1, isHidden: 1 });
achievementSchema.index({ 'stats.totalUnlocked': -1 });
achievementSchema.index({ tags: 1 });

// Pre-save middleware to update stats
achievementSchema.pre('save', function(next) {
  if (this.isNew) {
    this.stats.totalUnlocked = 0;
    this.stats.unlockRate = 0;
  }
  next();
});

// Static method to create achievement
achievementSchema.statics.createAchievement = async function(data) {
  const {
    name,
    description,
    category,
    type = 'single',
    rarity = 'common',
    requirements,
    rewards,
    icon,
    color = '#4CAF50',
    prerequisites = [],
    tags = []
  } = data;

  const achievement = new this({
    name,
    description,
    category,
    type,
    rarity,
    requirements,
    rewards,
    icon,
    color,
    prerequisites,
    tags
  });

  await achievement.save();
  return achievement;
};

// Instance method to check if user can unlock
achievementSchema.methods.canUnlock = function(userStats) {
  // Check if achievement is active
  if (!this.isActive) return false;
  
  // Check if achievement has expired
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  
  // Check prerequisites
  if (this.prerequisites.length > 0) {
    // This would need to be checked against user's unlocked achievements
    // Implementation depends on how user achievements are stored
  }
  
  // Check requirements based on category
  switch (this.category) {
    case 'distance':
      return userStats.totalDistance >= (this.requirements.distance || 0);
    case 'speed':
      return userStats.maxSpeed >= (this.requirements.speed || 0);
    case 'trips':
      return userStats.totalTrips >= (this.requirements.trips || 0);
    case 'social':
      return userStats.totalFriends >= (this.requirements.friends || 0);
    case 'posts':
      return userStats.totalPosts >= (this.requirements.posts || 0);
    default:
      return true;
  }
};

const Achievement = mongoose.model('Achievement', achievementSchema);
export default Achievement;
