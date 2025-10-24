// models/TrackingSession.js
import mongoose from "mongoose";

const trackingSessionSchema = new mongoose.Schema({
  // Session details
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Trip reference
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  
  // Rider information
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Session timing
  startedAt: {
    type: Date,
    required: true
  },
  
  endedAt: {
    type: Date,
    default: null
  },
  
  // Session status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Location tracking
  currentLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    timestamp: Date
  },
  
  // Route tracking
  routePoints: [{
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number, // km/h
    altitude: Number, // meters
    accuracy: Number
  }],
  
  // Trip statistics
  totalDistance: {
    type: Number, // in kilometers
    default: 0
  },
  
  totalDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  averageSpeed: {
    type: Number, // km/h
    default: 0
  },
  
  maxSpeed: {
    type: Number, // km/h
    default: 0
  },
  
  // Pause tracking
  pauses: [{
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    reason: String
  }],
  
  totalPauseTime: {
    type: Number, // in minutes
    default: 0
  },
  
  // Safety and alerts
  alerts: [{
    type: {
      type: String,
      enum: ['speed', 'location', 'crash', 'maintenance', 'weather']
    },
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      lat: Number,
      lng: Number
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],
  
  // Weather conditions during ride
  weatherConditions: [{
    timestamp: Date,
    temperature: Number, // Celsius
    humidity: Number, // percentage
    windSpeed: Number, // km/h
    visibility: Number, // km
    conditions: String // sunny, cloudy, rainy, etc.
  }],
  
  // Bike information
  bikeUsed: {
    brand: String,
    model: String,
    numberPlate: String
  },
  
  // Session metadata
  deviceInfo: {
    platform: String, // android, ios, web
    version: String,
    model: String
  },
  
  // Privacy settings
  shareLocation: {
    type: Boolean,
    default: true
  },
  
  shareWithFriends: {
    type: Boolean,
    default: false
  },
  
  // Emergency contacts
  emergencyContacts: [{
    name: String,
    phone: String,
    notified: {
      type: Boolean,
      default: false
    }
  }]

}, {
  timestamps: true
});

// Indexes for better performance
trackingSessionSchema.index({ sessionId: 1 });
trackingSessionSchema.index({ trip: 1, rider: 1 });
trackingSessionSchema.index({ status: 1, startedAt: -1 });
trackingSessionSchema.index({ rider: 1, startedAt: -1 });
trackingSessionSchema.index({ tripName: 'text', notes: 'text' });
trackingSessionSchema.index({ 'startLocation.name': 1 });
trackingSessionSchema.index({ 'endLocation.name': 1 });
trackingSessionSchema.index({ totalDistance: 1 });
trackingSessionSchema.index({ totalDuration: 1 });
trackingSessionSchema.index({ startedAt: -1 });
trackingSessionSchema.index({ endedAt: -1 });

// Generate unique session ID
trackingSessionSchema.pre('save', function(next) {
  if (!this.sessionId) {
    this.sessionId = `TRK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Calculate total duration when session ends
trackingSessionSchema.pre('save', function(next) {
  if (this.endedAt && this.startedAt) {
    this.totalDuration = Math.round((this.endedAt - this.startedAt) / (1000 * 60)); // minutes
  }
  next();
});

export default mongoose.model('TrackingSession', trackingSessionSchema);
