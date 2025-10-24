// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // Recipient of the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Sender of the notification (optional for system notifications)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'friend_request',
      'friend_accepted',
      'trip_invite',
      'trip_update',
      'post_like',
      'post_comment',
      'trip_started',
      'trip_completed',
      'emergency_alert',
      'nearby_rider',
      'achievement_unlocked',
      'system_update',
      'maintenance_reminder',
      'weather_alert',
      'general'
    ],
    required: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related entities
  relatedEntity: {
    type: {
      type: String,
      enum: ['trip', 'post', 'user', 'friend_request', 'achievement', 'emergency'],
      required: false
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    }
  },
  
  // Action data
  actionData: {
    actionType: {
      type: String,
      enum: ['view', 'accept', 'reject', 'join', 'like', 'comment', 'share'],
      required: false
    },
    actionUrl: String,
    actionParams: mongoose.Schema.Types.Mixed
  },
  
  // Notification status
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed'],
    default: 'unread'
  },
  
  // Delivery status
  deliveryStatus: {
    inApp: {
      delivered: { type: Boolean, default: false },
      deliveredAt: Date
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      deviceToken: String,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    }
  },
  
  // Notification metadata
  metadata: {
    imageUrl: String,
    iconUrl: String,
    sound: String,
    vibration: Boolean,
    badge: Number,
    category: String,
    threadId: String
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  
  // Read tracking
  readAt: Date,
  dismissedAt: Date,
  
  // Grouping for similar notifications
  groupKey: String,
  
  // Notification settings override
  settingsOverride: {
    sendPush: Boolean,
    sendEmail: Boolean,
    sendSms: Boolean
  }

}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ groupKey: 1 });
notificationSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });

// Pre-save middleware to set groupKey for similar notifications
notificationSchema.pre('save', function(next) {
  if (!this.groupKey && this.type && this.relatedEntity) {
    this.groupKey = `${this.type}_${this.relatedEntity.type}_${this.relatedEntity.id}`;
  }
  next();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const {
    recipient,
    sender,
    title,
    message,
    type,
    priority = 'medium',
    relatedEntity,
    actionData,
    metadata = {},
    settingsOverride = {}
  } = data;

  const notification = new this({
    recipient,
    sender,
    title,
    message,
    type,
    priority,
    relatedEntity,
    actionData,
    metadata,
    settingsOverride
  });

  await notification.save();
  return notification;
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Instance method to dismiss
notificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
