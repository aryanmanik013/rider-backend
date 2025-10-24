// models/Subscription.js
import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  // Subscription user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Subscription plan
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'pro', 'enterprise'],
    required: true
  },
  
  planName: {
    type: String,
    required: true
  },
  
  planDescription: {
    type: String,
    required: true
  },
  
  // Subscription pricing
  pricing: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    discountedAmount: {
      type: Number,
      default: 0
    }
  },
  
  // Subscription features
  features: {
    maxTrips: {
      type: Number,
      default: 10
    },
    maxEvents: {
      type: Number,
      default: 5
    },
    maxPosts: {
      type: Number,
      default: 20
    },
    maxFriends: {
      type: Number,
      default: 100
    },
    maxStorage: {
      type: Number,
      default: 1024 // MB
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    whiteLabel: {
      type: Boolean,
      default: false
    }
  },
  
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired', 'suspended'],
    default: 'active'
  },
  
  // Subscription dates
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  nextBillingDate: {
    type: Date
  },
  
  cancelledAt: {
    type: Date
  },
  
  // Payment information
  payment: {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    paymentMethod: String,
    autoRenew: {
      type: Boolean,
      default: true
    }
  },
  
  // Subscription metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin', 'promotion'],
      default: 'web'
    },
    promoCode: String,
    referrer: String,
    trialUsed: {
      type: Boolean,
      default: false
    },
    trialEndDate: Date,
    upgradeFrom: String,
    downgradeTo: String
  },
  
  // Subscription limits (current usage)
  usage: {
    tripsCreated: {
      type: Number,
      default: 0
    },
    eventsCreated: {
      type: Number,
      default: 0
    },
    postsCreated: {
      type: Number,
      default: 0
    },
    friendsAdded: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // MB
    }
  },
  
  // Subscription history
  history: [{
    action: {
      type: String,
      enum: ['created', 'upgraded', 'downgraded', 'renewed', 'cancelled', 'reactivated']
    },
    fromPlan: String,
    toPlan: String,
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    },
    reason: String,
    paymentId: mongoose.Schema.Types.ObjectId
  }],
  
  // Subscription notes
  notes: String,
  
  // Subscription tags
  tags: [String]

}, {
  timestamps: true
});

// Indexes for better performance
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ startDate: 1, endDate: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });
subscriptionSchema.index({ 'payment.paymentId': 1 });
subscriptionSchema.index({ createdAt: -1 });

// Pre-save middleware
subscriptionSchema.pre('save', function(next) {
  // Calculate discounted amount
  if (this.pricing.discount > 0) {
    this.pricing.discountedAmount = this.pricing.amount - (this.pricing.amount * this.pricing.discount / 100);
  } else {
    this.pricing.discountedAmount = this.pricing.amount;
  }
  
  // Calculate next billing date
  if (this.status === 'active' && this.payment.autoRenew) {
    const startDate = new Date(this.startDate);
    switch (this.pricing.billingCycle) {
      case 'monthly':
        startDate.setMonth(startDate.getMonth() + 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() + 3);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() + 1);
        break;
      case 'lifetime':
        startDate.setFullYear(startDate.getFullYear() + 100); // Far future
        break;
    }
    this.nextBillingDate = startDate;
  }
  
  next();
});

// Instance methods
subscriptionSchema.methods.upgrade = function(newPlan, paymentId) {
  const oldPlan = this.plan;
  this.plan = newPlan;
  this.status = 'active';
  
  // Add to history
  this.history.push({
    action: 'upgraded',
    fromPlan: oldPlan,
    toPlan: newPlan,
    paymentId: paymentId,
    date: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.downgrade = function(newPlan, reason) {
  const oldPlan = this.plan;
  this.plan = newPlan;
  
  // Add to history
  this.history.push({
    action: 'downgraded',
    fromPlan: oldPlan,
    toPlan: newPlan,
    reason: reason,
    date: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.payment.autoRenew = false;
  
  // Add to history
  this.history.push({
    action: 'cancelled',
    reason: reason,
    date: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.renew = function(paymentId) {
  this.status = 'active';
  this.payment.lastPaymentDate = new Date();
  this.payment.paymentId = paymentId;
  
  // Add to history
  this.history.push({
    action: 'renewed',
    paymentId: paymentId,
    date: new Date()
  });
  
  return this.save();
};

subscriptionSchema.methods.checkUsageLimit = function(feature) {
  const limits = {
    trips: this.features.maxTrips,
    events: this.features.maxEvents,
    posts: this.features.maxPosts,
    friends: this.features.maxFriends,
    storage: this.features.maxStorage
  };
  
  const usage = {
    trips: this.usage.tripsCreated,
    events: this.usage.eventsCreated,
    posts: this.usage.postsCreated,
    friends: this.usage.friendsAdded,
    storage: this.usage.storageUsed
  };
  
  return usage[feature] < limits[feature];
};

subscriptionSchema.methods.incrementUsage = function(feature, amount = 1) {
  switch (feature) {
    case 'trips':
      this.usage.tripsCreated += amount;
      break;
    case 'events':
      this.usage.eventsCreated += amount;
      break;
    case 'posts':
      this.usage.postsCreated += amount;
      break;
    case 'friends':
      this.usage.friendsAdded += amount;
      break;
    case 'storage':
      this.usage.storageUsed += amount;
      break;
  }
  
  return this.save();
};

// Static methods
subscriptionSchema.statics.findActiveByUser = function(userId) {
  return this.findOne({
    user: userId,
    status: 'active',
    endDate: { $gte: new Date() }
  });
};

subscriptionSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    endDate: { $lt: new Date() }
  });
};

subscriptionSchema.statics.findUpcomingRenewals = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    'payment.autoRenew': true,
    nextBillingDate: { $lte: futureDate }
  });
};

subscriptionSchema.statics.getSubscriptionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$pricing.amount', 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
