// models/Service.js
import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  // Service owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Bike information
  bike: {
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: Number,
    numberPlate: String,
    color: String,
    vin: String, // Vehicle Identification Number
    engineNumber: String,
    odometerReading: {
      type: Number,
      required: true
    }
  },
  
  // Service details
  serviceType: {
    type: String,
    enum: [
      'routine_maintenance',
      'oil_change',
      'brake_service',
      'tire_service',
      'engine_service',
      'electrical_service',
      'suspension_service',
      'chain_service',
      'battery_service',
      'inspection',
      'repair',
      'emergency_service',
      'custom'
    ],
    required: true
  },
  
  serviceCategory: {
    type: String,
    enum: [
      'preventive',
      'corrective',
      'emergency',
      'inspection',
      'upgrade'
    ],
    default: 'preventive'
  },
  
  // Service description
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Service provider
  serviceProvider: {
    name: {
      type: String,
      required: function() {
        return this.status === 'completed';
      }
    },
    type: {
      type: String,
      enum: ['authorized_dealer', 'local_mechanic', 'self_service', 'mobile_service'],
      required: function() {
        return this.status === 'completed';
      }
    },
    contact: {
      phone: String,
      email: String,
      address: String
    },
    rating: {
      type: Number,
      max: 5,
      default: 0,
      validate: {
        validator: function(value) {
          return this.status !== 'completed' || (value >= 1 && value <= 5);
        },
        message: 'Rating must be between 1 and 5 for completed services'
      }
    }
  },
  
  // Service location
  location: {
    name: String,
    address: String,
    city: String,
    state: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // Service dates
  serviceDate: {
    type: Date,
    required: function() {
      return this.status === 'completed';
    }
  },
  
  nextServiceDate: {
    type: Date
  },
  
  nextServiceOdometer: {
    type: Number
  },
  
  // Service items and parts
  serviceItems: [{
    item: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['part', 'labor', 'consumable', 'fluid'],
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    unit: {
      type: String,
      default: 'piece'
    },
    price: {
      type: Number,
      required: true
    },
    brand: String,
    partNumber: String,
    warranty: {
      duration: Number, // in months
      description: String
    }
  }],
  
  // Service costs
  costs: {
    partsCost: {
      type: Number,
      default: 0
    },
    laborCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      required: function() {
        return this.status === 'completed';
      }
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'online', 'installment'],
      default: 'cash'
    },
    invoiceNumber: String,
    warranty: {
      duration: Number, // in months
      description: String
    }
  },
  
  // Service status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  
  // Service notes and observations
  notes: {
    preService: String,
    duringService: String,
    postService: String,
    recommendations: [String],
    issues: [String],
    nextServiceReminders: [String]
  },
  
  // Service media
  media: {
    beforeImages: [String], // Cloudinary URLs
    afterImages: [String], // Cloudinary URLs
    invoiceImage: String, // Cloudinary URL
    receiptImage: String, // Cloudinary URL
    videos: [String] // Cloudinary URLs
  },
  
  // Service reminders
  reminders: [{
    type: {
      type: String,
      enum: ['next_service', 'warranty_expiry', 'part_replacement', 'inspection', 'custom'],
      required: true
    },
    scheduledFor: {
      type: Date,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  }],
  
  // Service ratings and feedback
  rating: {
    overall: {
      type: Number,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    timeliness: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    wouldRecommend: Boolean
  },
  
  // Service tags
  tags: [String],
  
  // Service priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Service recurrence
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurrencePattern: {
    type: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'odometer_based'],
      default: 'yearly'
    },
    interval: {
      type: Number,
      default: 1
    },
    odometerInterval: Number // in km
  },
  
  // Service history tracking
  previousService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  
  nextService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }

}, {
  timestamps: true
});

// Indexes for better performance
serviceSchema.index({ owner: 1, serviceDate: -1 });
serviceSchema.index({ 'bike.numberPlate': 1 });
serviceSchema.index({ serviceType: 1, serviceCategory: 1 });
serviceSchema.index({ status: 1 });
serviceSchema.index({ serviceDate: 1 });
serviceSchema.index({ nextServiceDate: 1 });
serviceSchema.index({ 'serviceProvider.name': 1 });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ title: 'text', description: 'text', notes: 'text' });
serviceSchema.index({ 'reminders.scheduledFor': 1, 'reminders.isActive': 1 });

// Pre-save middleware
serviceSchema.pre('save', function(next) {
  // Calculate total cost
  this.costs.totalCost = this.costs.partsCost + this.costs.laborCost;
  
  // Calculate next service date if not provided
  if (!this.nextServiceDate && this.isRecurring) {
    const serviceDate = new Date(this.serviceDate);
    switch (this.recurrencePattern.type) {
      case 'monthly':
        serviceDate.setMonth(serviceDate.getMonth() + this.recurrencePattern.interval);
        break;
      case 'quarterly':
        serviceDate.setMonth(serviceDate.getMonth() + (this.recurrencePattern.interval * 3));
        break;
      case 'yearly':
        serviceDate.setFullYear(serviceDate.getFullYear() + this.recurrencePattern.interval);
        break;
    }
    this.nextServiceDate = serviceDate;
  }
  
  // Calculate next service odometer if not provided
  if (!this.nextServiceOdometer && this.recurrencePattern.odometerInterval) {
    this.nextServiceOdometer = this.bike.odometerReading + this.recurrencePattern.odometerInterval;
  }
  
  next();
});

// Instance methods
serviceSchema.methods.addReminder = function(type, scheduledFor, message, priority = 'medium') {
  this.reminders.push({
    type,
    scheduledFor,
    message,
    priority,
    isActive: true,
    sent: false
  });
  return this.save();
};

serviceSchema.methods.markReminderSent = function(reminderId) {
  const reminder = this.reminders.id(reminderId);
  if (reminder) {
    reminder.sent = true;
    reminder.sentAt = new Date();
  }
  return this.save();
};

serviceSchema.methods.cancelReminder = function(reminderId) {
  const reminder = this.reminders.id(reminderId);
  if (reminder) {
    reminder.isActive = false;
  }
  return this.save();
};

serviceSchema.methods.addRating = function(ratingData) {
  this.rating = {
    ...this.rating,
    ...ratingData
  };
  return this.save();
};

// Static methods
serviceSchema.statics.findUpcomingServices = function(userId, limit = 10) {
  return this.find({
    owner: userId,
    status: { $in: ['scheduled', 'in_progress'] },
    serviceDate: { $gte: new Date() }
  })
  .sort({ serviceDate: 1 })
  .limit(limit);
};

serviceSchema.statics.findOverdueServices = function(userId, limit = 10) {
  return this.find({
    owner: userId,
    status: { $in: ['scheduled', 'in_progress'] },
    serviceDate: { $lt: new Date() }
  })
  .sort({ serviceDate: 1 })
  .limit(limit);
};

serviceSchema.statics.findServiceHistory = function(userId, bikeNumberPlate = null, limit = 20) {
  const query = { owner: userId, status: 'completed' };
  if (bikeNumberPlate) {
    query['bike.numberPlate'] = bikeNumberPlate;
  }
  
  return this.find(query)
  .sort({ serviceDate: -1 })
  .limit(limit);
};

serviceSchema.statics.findReminders = function(userId, startDate, endDate) {
  return this.find({
    owner: userId,
    'reminders.scheduledFor': { $gte: startDate, $lte: endDate },
    'reminders.isActive': true,
    'reminders.sent': false
  })
  .select('title serviceType bike reminders')
  .sort({ 'reminders.scheduledFor': 1 });
};

serviceSchema.statics.getServiceStats = function(userId) {
  return this.aggregate([
    { $match: { owner: userId } },
    {
      $group: {
        _id: null,
        totalServices: { $sum: 1 },
        totalCost: { $sum: '$costs.totalCost' },
        averageCost: { $avg: '$costs.totalCost' },
        byType: {
          $push: {
            type: '$serviceType',
            cost: '$costs.totalCost',
            date: '$serviceDate'
          }
        },
        byProvider: {
          $push: {
            provider: '$serviceProvider.name',
            cost: '$costs.totalCost'
          }
        }
      }
    }
  ]);
};

const Service = mongoose.model('Service', serviceSchema);
export default Service;
