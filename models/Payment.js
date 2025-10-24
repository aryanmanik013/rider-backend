// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  // Payment user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Payment details
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  
  orderId: {
    type: String,
    required: true
  },
  
  // Payment amount
  amount: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Payment method
  method: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'cod'],
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'captured', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  
  // Payment purpose
  purpose: {
    type: String,
    enum: [
      'subscription',
      'event_registration',
      'service_payment',
      'premium_feature',
      'donation',
      'merchandise',
      'other'
    ],
    required: true
  },
  
  // Related entity
  relatedEntity: {
    type: {
      type: String,
      enum: ['subscription', 'event', 'service', 'feature', 'product']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Payment description
  description: {
    type: String,
    required: true
  },
  
  // Payment metadata
  metadata: {
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    failureReason: String,
    refundId: String,
    refundAmount: Number,
    refundReason: String
  },
  
  // Payment timing
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: {
    type: Date
  },
  
  failedAt: {
    type: Date
  },
  
  refundedAt: {
    type: Date
  },
  
  // Payment fees
  fees: {
    gatewayFee: {
      type: Number,
      default: 0
    },
    processingFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  
  // Payment receipt
  receipt: {
    receiptNumber: String,
    invoiceNumber: String,
    receiptUrl: String,
    invoiceUrl: String
  },
  
  // Payment notes
  notes: String,
  
  // Payment tags
  tags: [String],
  
  // Payment verification
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verifiedAt: {
    type: Date
  },
  
  // Payment retry
  retryCount: {
    type: Number,
    default: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3
  }

}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ purpose: 1 });
paymentSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });
paymentSchema.index({ initiatedAt: -1 });
paymentSchema.index({ completedAt: -1 });

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  // Calculate total fees
  this.fees.totalFees = this.fees.gatewayFee + this.fees.processingFee;
  
  // Set completion/failure timestamps
  if (this.status === 'captured' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  if (this.status === 'failed' && !this.failedAt) {
    this.failedAt = new Date();
  }
  
  if (this.status === 'refunded' && !this.refundedAt) {
    this.refundedAt = new Date();
  }
  
  next();
});

// Instance methods
paymentSchema.methods.markAsCompleted = function(razorpayPaymentId, signature) {
  this.status = 'captured';
  this.metadata.razorpayPaymentId = razorpayPaymentId;
  this.metadata.razorpaySignature = signature;
  this.completedAt = new Date();
  this.isVerified = true;
  this.verifiedAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.metadata.failureReason = reason;
  this.failedAt = new Date();
  return this.save();
};

paymentSchema.methods.processRefund = function(refundId, refundAmount, reason) {
  this.status = 'refunded';
  this.metadata.refundId = refundId;
  this.metadata.refundAmount = refundAmount;
  this.metadata.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

paymentSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  return this.save();
};

// Static methods
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.purpose) {
    query.purpose = options.purpose;
  }
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

paymentSchema.statics.getPaymentStats = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'captured'] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        refundedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
        },
        totalRefunded: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$metadata.refundAmount', 0] }
        },
        byPurpose: {
          $push: {
            purpose: '$purpose',
            amount: '$amount',
            status: '$status'
          }
        },
        byMethod: {
          $push: {
            method: '$method',
            amount: '$amount',
            status: '$status'
          }
        }
      }
    }
  ]);
};

paymentSchema.statics.findPendingPayments = function() {
  return this.find({
    status: 'pending',
    retryCount: { $lt: '$maxRetries' },
    initiatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  });
};

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
