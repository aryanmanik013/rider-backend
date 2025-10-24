// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  // Event organizer
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Event details
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Event type
  eventType: {
    type: String,
    enum: [
      'ride_meetup',
      'group_ride',
      'charity_ride',
      'bike_show',
      'workshop',
      'social_gathering',
      'competition',
      'tour',
      'other'
    ],
    required: true
  },
  
  // Event category
  category: {
    type: String,
    enum: [
      'social',
      'charity',
      'educational',
      'competitive',
      'recreational',
      'commercial',
      'community'
    ],
    default: 'social'
  },
  
  // Event dates and times
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  registrationDeadline: {
    type: Date,
    required: true
  },
  
  // Event location
  location: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    landmark: String,
    parkingInfo: String
  },
  
  // Event requirements and details
  requirements: {
    bikeType: [String], // e.g., ['cruiser', 'sport', 'adventure']
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner'
    },
    safetyGear: [String], // e.g., ['helmet', 'gloves', 'jacket']
    documents: [String], // e.g., ['license', 'insurance', 'registration']
    ageRestriction: {
      minAge: Number,
      maxAge: Number
    },
    experienceRequired: String
  },
  
  // Event capacity and pricing
  capacity: {
    maxParticipants: {
      type: Number,
      required: true
    },
    currentParticipants: {
      type: Number,
      default: 0
    },
    waitlistEnabled: {
      type: Boolean,
      default: true
    },
    maxWaitlist: {
      type: Number,
      default: 20
    }
  },
  
  pricing: {
    isFree: {
      type: Boolean,
      default: true
    },
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    includes: [String], // e.g., ['food', 'refreshments', 'goodies']
    paymentMethods: [String] // e.g., ['cash', 'online', 'card']
  },
  
  // Event itinerary
  itinerary: [{
    time: String,
    activity: String,
    description: String,
    location: String,
    duration: Number // in minutes
  }],
  
  // Route information (if applicable)
  route: {
    hasRoute: {
      type: Boolean,
      default: false
    },
    totalDistance: Number, // in km
    estimatedDuration: Number, // in minutes
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging', 'expert']
    },
    terrain: [String], // e.g., ['highway', 'city', 'off-road']
    waypoints: [{
      name: String,
      lat: Number,
      lng: Number,
      order: Number
    }],
    stops: [{
      name: String,
      duration: Number, // in minutes
      purpose: String // e.g., 'rest', 'fuel', 'food'
    }]
  },
  
  // Event media
  media: {
    coverImage: String, // Cloudinary URL
    images: [String], // Array of Cloudinary URLs
    videos: [String], // Array of Cloudinary URLs
    documents: [String] // Array of Cloudinary URLs for PDFs, etc.
  },
  
  // Event contact and communication
  contact: {
    organizerPhone: String,
    organizerEmail: String,
    emergencyContact: {
      name: String,
      phone: String
    },
    whatsappGroup: String,
    telegramGroup: String
  },
  
  // Event status and visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'postponed'],
    default: 'draft'
  },
  
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public'
  },
  
  // Event tags and categories
  tags: [String],
  
  // Weather and conditions
  weatherPolicy: {
    rainPolicy: String, // e.g., 'postponed', 'cancelled', 'continues'
    extremeWeatherPolicy: String,
    weatherCheckDate: Date
  },
  
  // Event rules and guidelines
  rules: [String],
  
  guidelines: [String],
  
  // Event statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    interested: {
      type: Number,
      default: 0
    },
    attending: {
      type: Number,
      default: 0
    }
  },
  
  // Event feedback and ratings
  feedback: {
    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Event cancellation/postponement
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false
    },
    cancelledAt: Date,
    reason: String,
    refundPolicy: String
  },
  
  // Event reminders
  reminders: [{
    type: {
      type: String,
      enum: ['registration_deadline', 'event_start', 'preparation', 'custom']
    },
    scheduledFor: Date,
    message: String,
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }]

}, {
  timestamps: true
});

// Indexes for better performance
eventSchema.index({ organizer: 1, createdAt: -1 });
eventSchema.index({ status: 1, visibility: 1 });
eventSchema.index({ eventType: 1, category: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ 'location.city': 1, 'location.state': 1 });
eventSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
eventSchema.index({ registrationDeadline: 1 });
eventSchema.index({ createdAt: -1 });

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Update current participants count
  if (this.isModified('participants')) {
    this.capacity.currentParticipants = this.participants.length;
  }
  
  // Validate dates
  if (this.startDate >= this.endDate) {
    return next(new Error('Start date must be before end date'));
  }
  
  if (this.registrationDeadline >= this.startDate) {
    return next(new Error('Registration deadline must be before start date'));
  }
  
  next();
});

// Instance methods
eventSchema.methods.addParticipant = function(userId) {
  if (this.participants.length >= this.capacity.maxParticipants) {
    if (this.capacity.waitlistEnabled && this.waitlist.length < this.capacity.maxWaitlist) {
      this.waitlist.push({
        user: userId,
        joinedAt: new Date()
      });
      return { success: true, type: 'waitlist' };
    }
    return { success: false, message: 'Event is full' };
  }
  
  // Check if user is already participating
  if (this.participants.some(p => p.user.toString() === userId.toString())) {
    return { success: false, message: 'Already participating' };
  }
  
  this.participants.push({
    user: userId,
    joinedAt: new Date(),
    status: 'confirmed'
  });
  
  this.capacity.currentParticipants = this.participants.length;
  return { success: true, type: 'participant' };
};

eventSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.participants.findIndex(p => p.user.toString() === userId.toString());
  if (participantIndex === -1) {
    return { success: false, message: 'Not participating' };
  }
  
  this.participants.splice(participantIndex, 1);
  this.capacity.currentParticipants = this.participants.length;
  
  // Move someone from waitlist if available
  if (this.waitlist.length > 0) {
    const waitlistUser = this.waitlist.shift();
    this.participants.push({
      user: waitlistUser.user,
      joinedAt: new Date(),
      status: 'confirmed'
    });
    this.capacity.currentParticipants = this.participants.length;
  }
  
  return { success: true };
};

eventSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

eventSchema.methods.addRating = function(userId, rating, comment) {
  // Remove existing rating from this user
  this.feedback.reviews = this.feedback.reviews.filter(r => r.user.toString() !== userId.toString());
  
  // Add new rating
  this.feedback.reviews.push({
    user: userId,
    rating: rating,
    comment: comment,
    createdAt: new Date()
  });
  
  // Recalculate average
  const totalRating = this.feedback.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.feedback.averageRating = totalRating / this.feedback.reviews.length;
  this.feedback.totalRatings = this.feedback.reviews.length;
  
  return this.save();
};

// Static methods
eventSchema.statics.findNearby = function(lat, lng, radiusKm = 50, limit = 20) {
  const earthRadius = 6371; // Earth's radius in km
  
  return this.find({
    status: { $in: ['published'] },
    visibility: 'public',
    startDate: { $gte: new Date() },
    $expr: {
      $lte: [
        {
          $multiply: [
            earthRadius,
            {
              $acos: {
                $add: [
                  {
                    $multiply: [
                      { $sin: { $degreesToRadians: lat } },
                      { $sin: { $degreesToRadians: '$location.coordinates.lat' } }
                    ]
                  },
                  {
                    $multiply: [
                      { $cos: { $degreesToRadians: lat } },
                      { $cos: { $degreesToRadians: '$location.coordinates.lat' } },
                      { $cos: { $degreesToRadians: { $subtract: [lng, '$location.coordinates.lng'] } } }
                    ]
                  }
                ]
              }
            }
          ]
        },
        radiusKm
      ]
    }
  })
  .populate('organizer', 'name avatar')
  .sort({ startDate: 1 })
  .limit(limit);
};

eventSchema.statics.findUpcoming = function(limit = 20) {
  return this.find({
    status: { $in: ['published'] },
    visibility: 'public',
    startDate: { $gte: new Date() }
  })
  .populate('organizer', 'name avatar')
  .sort({ startDate: 1 })
  .limit(limit);
};

const Event = mongoose.model('Event', eventSchema);
export default Event;
