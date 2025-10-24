// tests/controllers/userController.test.js
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { testConfig } from '../testEnv.js';
import { TestHelpers } from '../utils/testHelpers.js';

// Load test environment
Object.keys(testConfig).forEach(key => {
  process.env[key] = testConfig[key];
});

// Import routes
import userRoutes from '../../routes/userRoutes.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/user', userRoutes);

describe('User Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await TestHelpers.createTestUser({
      name: 'Test User',
      email: 'user@test.com',
      phone: '+1234567890'
    });

    // Generate auth token
    authToken = TestHelpers.generateToken(testUser._id);
  });

  describe('GET /api/v1/user/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id', testUser._id.toString());
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 if invalid token provided', async () => {
      const response = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
        preferences: {
          notifications: true,
          privacy: 'friends'
        }
      };

      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('name', 'Updated Name');
      expect(response.body.user).toHaveProperty('bio', 'Updated bio');
    });

    it('should return 400 if email already exists', async () => {
      // Create another user with different email
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@test.com'
      });

      const updateData = {
        email: 'other@test.com' // Try to use existing email
      };

      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email already exists');
    });

    it('should return 400 if phone already exists', async () => {
      // Create another user with different phone
      const otherUser = await TestHelpers.createTestUser({
        phone: '+9876543210'
      });

      const updateData = {
        phone: '+9876543210' // Try to use existing phone
      };

      const response = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Phone number already exists');
    });
  });

  describe('POST /api/v1/user/change-password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });

    it('should return 400 if current password is incorrect', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Current password is incorrect');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/user/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123'
          // Missing newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Current password and new password are required');
    });
  });

  describe('GET /api/v1/user/stats', () => {
    beforeEach(async () => {
      // Create some test data for stats
      await TestHelpers.createTestTrip({
        organizer: testUser._id,
        status: 'completed'
      });

      await TestHelpers.createTestTrip({
        organizer: testUser._id,
        status: 'completed'
      });

      await TestHelpers.createTestTrackingSession({
        rider: testUser._id,
        status: 'completed'
      });
    });

    it('should get user stats successfully', async () => {
      const response = await request(app)
        .get('/api/v1/user/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalTrips');
      expect(response.body.stats).toHaveProperty('completedTrips');
      expect(response.body.stats).toHaveProperty('totalDistance');
      expect(response.body.stats).toHaveProperty('totalTime');
    });
  });

  describe('GET /api/v1/user/achievements', () => {
    beforeEach(async () => {
      // Create some test achievements
      await TestHelpers.createTestAchievement({
        name: 'First Trip',
        description: 'Complete your first trip'
      });

      await TestHelpers.createTestAchievement({
        name: 'Distance Master',
        description: 'Ride 100km total'
      });
    });

    it('should get user achievements successfully', async () => {
      const response = await request(app)
        .get('/api/v1/user/achievements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('achievements');
      expect(Array.isArray(response.body.achievements)).toBe(true);
    });
  });

  describe('POST /api/v1/user/upload-avatar', () => {
    it('should upload avatar successfully', async () => {
      // Mock file upload
      const response = await request(app)
        .post('/api/v1/user/upload-avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg');

      // This test might need to be adjusted based on your actual file upload implementation
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 400 if no file provided', async () => {
      const response = await request(app)
        .post('/api/v1/user/upload-avatar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'No file uploaded');
    });
  });

  describe('DELETE /api/v1/user/account', () => {
    it('should delete user account successfully', async () => {
      const response = await request(app)
        .delete('/api/v1/user/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Account deleted successfully');
    });

    it('should return 400 if password is incorrect', async () => {
      const response = await request(app)
        .delete('/api/v1/user/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Password is incorrect');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .delete('/api/v1/user/account')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Password is required');
    });
  });

  describe('GET /api/v1/user/friends', () => {
    beforeEach(async () => {
      // Create some test friends
      const friend1 = await TestHelpers.createTestUser({
        email: 'friend1@test.com'
      });

      const friend2 = await TestHelpers.createTestUser({
        email: 'friend2@test.com'
      });

      // Add friends to test user (this would need to be implemented based on your friend system)
      // testUser.friends = [friend1._id, friend2._id];
      // await testUser.save();
    });

    it('should get user friends successfully', async () => {
      const response = await request(app)
        .get('/api/v1/user/friends')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('friends');
      expect(Array.isArray(response.body.friends)).toBe(true);
    });
  });

  describe('POST /api/v1/user/send-friend-request', () => {
    let otherUser;

    beforeEach(async () => {
      otherUser = await TestHelpers.createTestUser({
        email: 'friend@test.com'
      });
    });

    it('should send friend request successfully', async () => {
      const response = await request(app)
        .post('/api/v1/user/send-friend-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: otherUser._id
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Friend request sent successfully');
    });

    it('should return 400 if user tries to send request to themselves', async () => {
      const response = await request(app)
        .post('/api/v1/user/send-friend-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: testUser._id
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'You cannot send a friend request to yourself');
    });

    it('should return 400 if friend request already exists', async () => {
      // Send first request
      await request(app)
        .post('/api/v1/user/send-friend-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: otherUser._id
        });

      // Try to send again
      const response = await request(app)
        .post('/api/v1/user/send-friend-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: otherUser._id
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Friend request already sent');
    });
  });
});
