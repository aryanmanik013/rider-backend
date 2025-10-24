// models/Trip.js
import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
  // Trip organizer
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Trip details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    maxlength: 1000
  },
  
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Route information
  waypoints: [{
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    name: String,
    order: Number
  }],
  
  stops: [{
    name: String,
    lat: Number,
    lng: Number,
    order: Number
  }],
  
  // Trip metadata
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  
  estimatedDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  
  // Trip scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  
  scheduledTime: {
    type: String, // "09:00" format
    required: true
  },
  
  // Participants
  maxParticipants: {
    type: Number,
    default: 10
  },
  
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Trip status
  status: {
    type: String,
    enum: ['planning', 'scheduled', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  
  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  
  // Requirements
  requirements: [{
    type: String,
    enum: ['helmet', 'license', 'insurance', 'experience', 'gear']
  }],
  
  // Weather and conditions
  weather: String,
  roadCondition: String,
  
  // Trip type
  tripType: {
    type: String,
    enum: ['leisure', 'adventure', 'commute', 'group', 'solo'],
    default: 'leisure'
  },
  
  // Location
  startLocation: {
    name: String,
    lat: Number,
    lng: Number
  },
  
  endLocation: {
    name: String,
    lat: Number,
    lng: Number
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
  
  likesCount: {
    type: Number,
    default: 0
  },
  
  // Tracking sessions
  trackingSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrackingSession'
  }]

}, {
  timestamps: true
});

// Indexes for better performance
tripSchema.index({ organizer: 1, createdAt: -1 });
tripSchema.index({ status: 1, scheduledDate: 1 });
tripSchema.index({ visibility: 1, status: 1 });
tripSchema.index({ 'waypoints.lat': 1, 'waypoints.lng': 1 });

// Update likes count
tripSchema.pre('save', function(next) {
  this.likesCount = this.likes.length;
  next();
});

// Add search indexes
tripSchema.index({ title: 'text', description: 'text', stops: 'text', notes: 'text' });
tripSchema.index({ organizer: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ difficulty: 1 });
tripSchema.index({ tripType: 1 });
tripSchema.index({ scheduledDate: 1 });
tripSchema.index({ totalDistance: 1 });
tripSchema.index({ createdAt: -1 });

export default mongoose.model('Trip', tripSchema);