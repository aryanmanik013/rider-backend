// models/Reel.js
import mongoose from "mongoose";

const reelSchema = new mongoose.Schema({
  // Creator information
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Video content
  video: {
    url: {
      type: String,
      required: true
    },
    cloudinaryId: {
      type: String,
      required: true
    },
    duration: {
      type: Number, // in seconds
      required: true,
      min: 1,
      max: 60 // Instagram-style 60 second limit
    },
    thumbnail: {
      type: String, // URL to thumbnail image
      required: true
    },
    aspectRatio: {
      type: String,
      enum: ['9:16', '16:9', '1:1'],
      default: '9:16' // Vertical format for reels
    }
  },
  
  // Audio/Music
  audio: {
    hasAudio: {
      type: Boolean,
      default: true
    },
    originalAudio: {
      type: Boolean,
      default: true // true = original audio, false = added music
    },
    musicTrack: {
      name: String,
      artist: String,
      duration: Number,
      startTime: Number // when music starts in the reel
    }
  },
  
  // Content details
  caption: {
    type: String,
    maxlength: 2200, // Instagram limit
    required: false
  },
  
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Location
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Engagement
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  viewHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    watchTime: Number // seconds watched
  }],
  
  // Engagement counts (for performance)
  likesCount: {
    type: Number,
    default: 0
  },
  
  commentsCount: {
    type: Number,
    default: 0
  },
  
  sharesCount: {
    type: Number,
    default: 0
  },
  
  savesCount: {
    type: Number,
    default: 0
  },
  
  // Privacy and visibility
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  
  // Content moderation
  isApproved: {
    type: Boolean,
    default: true
  },
  
  isFlagged: {
    type: Boolean,
    default: false
  },
  
  flaggedReason: {
    type: String,
    enum: ['inappropriate', 'spam', 'copyright', 'violence', 'other']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Trending/Discovery
  trendingScore: {
    type: Number,
    default: 0
  },
  
  // Related to cycling/rider context
  rideContext: {
    bikeType: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert']
    },
    terrain: {
      type: String,
      enum: ['road', 'mountain', 'trail', 'urban', 'track']
    },
    weather: String,
    distance: Number, // km
    duration: Number // minutes
  }

}, { 
  timestamps: true 
});

// Indexes for better performance
reelSchema.index({ creator: 1, createdAt: -1 });
reelSchema.index({ status: 1, createdAt: -1 });
reelSchema.index({ visibility: 1, createdAt: -1 });
reelSchema.index({ trendingScore: -1, createdAt: -1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ likesCount: -1 });
reelSchema.index({ views: -1 });
reelSchema.index({ 'rideContext.terrain': 1 });
reelSchema.index({ 'rideContext.difficulty': 1 });

// Text search index
reelSchema.index({ 
  caption: 'text', 
  hashtags: 'text',
  'rideContext.bikeType': 'text',
  'rideContext.terrain': 'text'
});

// Update counts when arrays change
reelSchema.pre('save', function(next) {
  this.likesCount = this.likes.length;
  this.commentsCount = this.comments.length;
  this.sharesCount = this.shares.length;
  this.savesCount = this.saves.length;
  this.views = this.viewHistory.length;
  
  // Calculate trending score based on recent engagement
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentLikes = this.likes.filter(like => like.createdAt > oneDayAgo).length;
  const recentComments = this.comments.filter(comment => comment.createdAt > oneDayAgo).length;
  const recentShares = this.shares.filter(share => share.createdAt > oneDayAgo).length;
  const recentViews = this.viewHistory.filter(view => view.viewedAt > oneDayAgo).length;
  
  this.trendingScore = (recentLikes * 2) + (recentComments * 3) + (recentShares * 4) + (recentViews * 0.1);
  
  next();
});

// Instance methods
reelSchema.methods.addView = function(userId, watchTime = 0) {
  // Check if user already viewed this reel recently (within 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existingView = this.viewHistory.find(view => 
    view.user.toString() === userId.toString() && 
    view.viewedAt > oneHourAgo
  );
  
  if (!existingView) {
    this.viewHistory.push({
      user: userId,
      watchTime: watchTime
    });
  } else {
    // Update watch time if user watched more
    existingView.watchTime = Math.max(existingView.watchTime, watchTime);
  }
  
  return this.save();
};

reelSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLike) {
    this.likes = this.likes.filter(like => 
      like.user.toString() !== userId.toString()
    );
    return { liked: false, likesCount: this.likes.length };
  } else {
    this.likes.push({ user: userId });
    return { liked: true, likesCount: this.likes.length };
  }
};

reelSchema.methods.toggleSave = function(userId) {
  const existingSave = this.saves.find(save => 
    save.user.toString() === userId.toString()
  );
  
  if (existingSave) {
    this.saves = this.saves.filter(save => 
      save.user.toString() !== userId.toString()
    );
    return { saved: false, savesCount: this.saves.length };
  } else {
    this.saves.push({ user: userId });
    return { saved: true, savesCount: this.saves.length };
  }
};

// Static methods
reelSchema.statics.getFeed = function(userId, options = {}) {
  const query = {
    status: 'active',
    isApproved: true,
    visibility: { $in: ['public', 'followers'] }
  };
  
  return this.find(query)
    .populate('creator', 'name avatar username')
    .sort({ trendingScore: -1, createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

reelSchema.statics.getTrending = function(options = {}) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    isApproved: true,
    visibility: 'public',
    createdAt: { $gte: oneDayAgo }
  })
    .populate('creator', 'name avatar username')
    .sort({ trendingScore: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

reelSchema.statics.getByHashtag = function(hashtag, options = {}) {
  return this.find({
    hashtags: hashtag.toLowerCase(),
    status: 'active',
    isApproved: true,
    visibility: 'public'
  })
    .populate('creator', 'name avatar username')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

const Reel = mongoose.model("Reel", reelSchema);
export default Reel;
