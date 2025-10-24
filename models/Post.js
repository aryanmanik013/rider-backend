// models/Post.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  media: [{
    type: String, // URLs to images/videos
    required: false
  }],
  
  // For ride events
  route_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: false
  },
  
  // Post categorization
  tags: [{
    type: String,
    enum: ['rides', 'events', 'tips', 'gear', 'photos', 'videos', 'general'],
    default: ['general']
  }],
  
  // Post type
  type: {
    type: String,
    enum: ['ride', 'event', 'tip', 'photo', 'general'],
    default: 'general'
  },
  
  // Location information
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Engagement metrics
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
    author: {
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
  }],
  
  // Visibility settings
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  
  // Ride-specific fields
  rideDetails: {
    distance: Number, // in kilometers
    duration: Number, // in minutes
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert']
    },
    weather: String,
    roadCondition: String
  },
  
  // Event-specific fields
  eventDetails: {
    eventDate: Date,
    eventTime: String,
    maxParticipants: Number,
    currentParticipants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    meetingPoint: String,
    requirements: [String]
  },
  
  // Engagement counts (for performance)
  likesCount: {
    type: Number,
    default: 0
  },
  
  commentsCount: {
    type: Number,
    default: 0
  },
  
  // Post status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }

}, { 
  timestamps: true 
});

// Indexes for better performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text', tags: 'text' });
postSchema.index({ 'location.name': 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likesCount: -1 });
postSchema.index({ commentsCount: -1 });

// Update counts when likes/comments change
postSchema.pre('save', function(next) {
  this.likesCount = this.likes.length;
  this.commentsCount = this.comments.length;
  next();
});

const Post = mongoose.model("Post", postSchema);
export default Post;
