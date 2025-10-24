// controllers/notificationsController.js
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Get user notifications with pagination
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type, status = 'unread' } = req.query;

    const query = { recipient: userId };
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .populate('recipient', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalNotifications = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      status: 'unread' 
    });

    // Format notifications
    const formattedNotifications = notifications.map(notification => ({
      _id: notification._id,
      sender: notification.sender ? {
        _id: notification.sender._id,
        name: notification.sender.name,
        avatar: notification.sender.avatar
      } : null,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      status: notification.status,
      relatedEntity: notification.relatedEntity,
      actionData: notification.actionData,
      metadata: notification.metadata,
      readAt: notification.readAt,
      dismissedAt: notification.dismissedAt,
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / parseInt(limit)),
        totalNotifications,
        unreadCount
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notification.markAsRead();

    res.json({
      message: "Notification marked as read",
      notification: {
        _id: notification._id,
        status: notification.status,
        readAt: notification.readAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, status: 'unread' },
      { 
        status: 'read',
        readAt: new Date()
      }
    );

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Dismiss notification
export const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await notification.dismiss();

    res.json({
      message: "Notification dismissed",
      notification: {
        _id: notification._id,
        status: notification.status,
        dismissedAt: notification.dismissedAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get notification settings
export const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('notificationSettings');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      notificationSettings: user.notificationSettings
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      pushNotifications,
      emailNotifications,
      smsNotifications,
      quietHours,
      deviceTokens
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update settings
    if (pushNotifications) {
      user.notificationSettings.pushNotifications = {
        ...user.notificationSettings.pushNotifications,
        ...pushNotifications
      };
    }

    if (emailNotifications) {
      user.notificationSettings.emailNotifications = {
        ...user.notificationSettings.emailNotifications,
        ...emailNotifications
      };
    }

    if (smsNotifications) {
      user.notificationSettings.smsNotifications = {
        ...user.notificationSettings.smsNotifications,
        ...smsNotifications
      };
    }

    if (quietHours) {
      user.notificationSettings.quietHours = {
        ...user.notificationSettings.quietHours,
        ...quietHours
      };
    }

    if (deviceTokens) {
      // Add or update device tokens
      deviceTokens.forEach(newToken => {
        const existingToken = user.notificationSettings.deviceTokens.find(
          token => token.token === newToken.token
        );
        
        if (existingToken) {
          existingToken.lastUsed = new Date();
          existingToken.isActive = true;
        } else {
          user.notificationSettings.deviceTokens.push({
            ...newToken,
            lastUsed: new Date(),
            isActive: true
          });
        }
      });
    }

    await user.save();

    res.json({
      message: "Notification settings updated successfully",
      notificationSettings: user.notificationSettings
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send push notification
export const sendPushNotification = async (req, res) => {
  try {
    const { userId, title, message, type = 'general', data = {} } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ 
        message: "User ID, title, and message are required" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has push notifications enabled
    if (!user.notificationSettings.pushNotifications.enabled) {
      return res.status(400).json({ 
        message: "User has push notifications disabled" 
      });
    }

    // Create notification
    const notification = await Notification.createNotification({
      recipient: userId,
      title,
      message,
      type,
      priority: 'medium',
      metadata: {
        ...data,
        sound: 'default',
        vibration: true
      }
    });

    // Send push notification to all active device tokens
    const activeTokens = user.notificationSettings.deviceTokens.filter(
      token => token.isActive
    );

    const pushResults = [];
    
    for (const deviceToken of activeTokens) {
      try {
        // Here you would integrate with FCM (Firebase Cloud Messaging) or APNS
        // For now, we'll simulate the push notification
        const pushResult = await sendPushToDevice(deviceToken, {
          title,
          message,
          type,
          data: {
            notificationId: notification._id,
            ...data
          }
        });

        pushResults.push({
          token: deviceToken.token,
          platform: deviceToken.platform,
          success: pushResult.success,
          error: pushResult.error
        });

        // Update notification delivery status
        notification.deliveryStatus.push.sent = true;
        notification.deliveryStatus.push.sentAt = new Date();
        notification.deliveryStatus.push.deviceToken = deviceToken.token;

      } catch (error) {
        pushResults.push({
          token: deviceToken.token,
          platform: deviceToken.platform,
          success: false,
          error: error.message
        });
      }
    }

    await notification.save();

    res.json({
      message: "Push notification sent",
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type
      },
      pushResults
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Notification.aggregate([
      { $match: { recipient: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          read: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          },
          dismissed: {
            $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
          }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      { $match: { recipient: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      overall: stats[0] || { total: 0, unread: 0, read: 0, dismissed: 0 },
      byType: typeStats
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({
      message: "Notification deleted successfully",
      deletedNotification: {
        _id: notification._id,
        title: notification.title,
        type: notification.type
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to send push notification (placeholder)
const sendPushToDevice = async (deviceToken, payload) => {
  // This is a placeholder function
  // In a real implementation, you would integrate with:
  // - Firebase Cloud Messaging (FCM) for Android
  // - Apple Push Notification Service (APNS) for iOS
  // - Web Push API for web browsers
  
  console.log(`Sending push to ${deviceToken.platform} device:`, payload);
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        messageId: `msg_${Date.now()}`
      });
    }, 100);
  });
};
