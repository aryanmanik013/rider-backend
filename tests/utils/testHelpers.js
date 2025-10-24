// tests/utils/testHelpers.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export class TestHelpers {
  static async createTestUser(userData = {}) {
    const User = (await import('../../models/User.js')).default;
    
    const defaultData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      password: await bcrypt.hash('password123', 10),
      isVerified: true,
      ...userData
    };

    return await User.create(defaultData);
  }

  static async createTestTrip(tripData = {}) {
    const Trip = (await import('../../models/Trip.js')).default;
    
    const defaultData = {
      title: 'Test Trip',
      description: 'Test trip description',
      startLocation: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
      endLocation: { lat: 40.7589, lng: -73.9851, address: 'Times Square, NY' },
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      maxParticipants: 10,
      difficulty: 'medium',
      distance: 15.5,
      ...tripData
    };

    return await Trip.create(defaultData);
  }

  static async createTestTrackingSession(sessionData = {}) {
    const TrackingSession = (await import('../../models/TrackingSession.js')).default;
    
    const defaultData = {
      trip: sessionData.trip || (await this.createTestTrip())._id,
      rider: sessionData.rider || (await this.createTestUser())._id,
      status: 'active',
      startedAt: new Date(),
      ...sessionData
    };

    return await TrackingSession.create(defaultData);
  }

  static generateToken(userId, secret = process.env.JWT_SECRET || 'test-secret') {
    return jwt.sign({ userId }, secret, { expiresIn: '1h' });
  }

  static async createAuthenticatedRequest(app, userData = {}) {
    const user = await this.createTestUser(userData);
    const token = this.generateToken(user._id);
    
    return {
      user,
      token,
      request: (method, url) => {
        return app[method.toLowerCase()](url).set('Authorization', `Bearer ${token}`);
      }
    };
  }

  static async createTestPost(postData = {}) {
    const Post = (await import('../../models/Post.js')).default;
    
    const defaultData = {
      content: 'Test post content',
      author: postData.author || (await this.createTestUser())._id,
      type: 'text',
      ...postData
    };

    return await Post.create(defaultData);
  }

  static async createTestEvent(eventData = {}) {
    const Event = (await import('../../models/Event.js')).default;
    
    const defaultData = {
      title: 'Test Event',
      description: 'Test event description',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      location: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
      organizer: eventData.organizer || (await this.createTestUser())._id,
      ...eventData
    };

    return await Event.create(defaultData);
  }

  static async createTestService(serviceData = {}) {
    const Service = (await import('../../models/Service.js')).default;
    
    const defaultData = {
      title: 'Test Service',
      description: 'Test service description',
      category: 'repair',
      price: 50,
      provider: serviceData.provider || (await this.createTestUser())._id,
      location: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
      ...serviceData
    };

    return await Service.create(defaultData);
  }

  static async createTestNotification(notificationData = {}) {
    const Notification = (await import('../../models/Notification.js')).default;
    
    const defaultData = {
      recipient: notificationData.recipient || (await this.createTestUser())._id,
      sender: notificationData.sender || (await this.createTestUser())._id,
      type: 'trip_invite',
      title: 'Test Notification',
      message: 'Test notification message',
      ...notificationData
    };

    return await Notification.create(defaultData);
  }

  static async createTestAchievement(achievementData = {}) {
    const Achievement = (await import('../../models/Achievement.js')).default;
    
    const defaultData = {
      name: 'Test Achievement',
      description: 'Test achievement description',
      icon: '🏆',
      criteria: { type: 'distance', value: 100 },
      ...achievementData
    };

    return await Achievement.create(defaultData);
  }

  static async createTestPayment(paymentData = {}) {
    const Payment = (await import('../../models/Payment.js')).default;
    
    const defaultData = {
      user: paymentData.user || (await this.createTestUser())._id,
      amount: 100,
      currency: 'USD',
      status: 'pending',
      type: 'subscription',
      ...paymentData
    };

    return await Payment.create(defaultData);
  }

  static async createTestSubscription(subscriptionData = {}) {
    const Subscription = (await import('../../models/Subscription.js')).default;
    
    const defaultData = {
      user: subscriptionData.user || (await this.createTestUser())._id,
      plan: 'premium',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ...subscriptionData
    };

    return await Subscription.create(defaultData);
  }

  static async createTestMedia(mediaData = {}) {
    const Media = (await import('../../models/Media.js')).default;
    
    const defaultData = {
      url: 'https://example.com/test-image.jpg',
      type: 'image',
      uploadedBy: mediaData.uploadedBy || (await this.createTestUser())._id,
      ...mediaData
    };

    return await Media.create(defaultData);
  }

  static async createTestMessage(messageData = {}) {
    const Message = (await import('../../models/Message.js')).default;
    
    const defaultData = {
      sender: messageData.sender || (await this.createTestUser())._id,
      content: 'Test message content',
      type: 'text',
      ...messageData
    };

    return await Message.create(defaultData);
  }

  // Helper to clean up test data
  static async cleanupTestData() {
    const models = [
      'User', 'Trip', 'TrackingSession', 'Post', 'Event', 
      'Service', 'Notification', 'Achievement', 'Payment', 
      'Subscription', 'Media', 'Message'
    ];

    for (const modelName of models) {
      try {
        const Model = (await import(`../../models/${modelName}.js`)).default;
        await Model.deleteMany({});
      } catch (error) {
        // Model might not exist, continue
        console.warn(`Model ${modelName} not found, skipping cleanup`);
      }
    }
  }

  // Helper to create test app with authentication
  static createTestApp(routes) {
    const express = require('express');
    const cors = require('cors');
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    if (Array.isArray(routes)) {
      routes.forEach(route => {
        app.use(route.path, route.router);
      });
    } else {
      app.use(routes);
    }
    
    return app;
  }

  // Helper to validate response structure
  static validateResponse(response, expectedFields = []) {
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('body');
    
    expectedFields.forEach(field => {
      expect(response.body).toHaveProperty(field);
    });
  }

  // Helper to validate error response
  static validateErrorResponse(response, expectedStatus, expectedMessage) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('message');
    
    if (expectedMessage) {
      expect(response.body.message).toBe(expectedMessage);
    }
  }

  // Helper to validate success response
  static validateSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('message');
  }
}
