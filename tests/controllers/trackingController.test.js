// tests/controllers/trackingController.test.js
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConfig } from '../testEnv.js';

// Load test environment
Object.keys(testConfig).forEach(key => {
  process.env[key] = testConfig[key];
});

// Import routes and middleware
import trackingRoutes from '../../routes/trackingRoutes.js';
import { protect } from '../../middleware/authMiddleware.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/track', trackingRoutes);

describe('Tracking Controller', () => {
  let testUser;
  let testTrip;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Test Rider',
      email: 'rider@test.com',
      phone: '+1234567890'
    });

    // Create test trip
    testTrip = await global.testUtils.createTestTrip({
      title: 'Test Tracking Trip',
      organizer: testUser._id,
      participants: [{
        user: testUser._id,
        status: 'approved'
      }]
    });

    // Generate auth token
    authToken = await global.testUtils.generateToken(testUser._id);
  });

  describe('POST /api/v1/track/start', () => {
    it('should start tracking session successfully', async () => {
      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('message', 'Tracking session started successfully');
      expect(response.body.session).toHaveProperty('status', 'active');
    });

    it('should return 400 if tripId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Trip ID is required');
    });

    it('should return 404 if trip does not exist', async () => {
      const fakeTripId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: fakeTripId,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Trip not found');
    });

    it('should return 403 if user is not a participant', async () => {
      // Create another user who is not a participant
      const otherUser = await global.testUtils.createTestUser({
        email: 'other@test.com'
      });
      const otherToken = await global.testUtils.generateToken(otherUser._id);

      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'You must be a participant in this trip to start tracking');
    });

    it('should return 400 if user already has active session', async () => {
      // Start first session
      await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      // Try to start second session
      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'You already have an active tracking session for this trip');
    });
  });

  describe('POST /api/v1/track/stop', () => {
    let sessionId;

    beforeEach(async () => {
      // Start a tracking session first
      const startResponse = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });
      
      sessionId = startResponse.body.sessionId;
    });

    it('should stop tracking session successfully', async () => {
      const response = await request(app)
        .post('/api/v1/track/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: sessionId,
          endedAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tracking session stopped successfully');
      expect(response.body.session).toHaveProperty('status', 'completed');
    });

    it('should return 400 if sessionId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/track/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endedAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Session ID is required');
    });

    it('should return 404 if session does not exist', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post('/api/v1/track/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: fakeSessionId,
          endedAt: new Date().toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Tracking session not found');
    });
  });

  describe('GET /api/v1/track/sessions/:tripId', () => {
    beforeEach(async () => {
      // Start a tracking session
      await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });
    });

    it('should get tracking sessions for trip', async () => {
      const response = await request(app)
        .get(`/api/v1/track/sessions/${testTrip._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    it('should return 404 if trip does not exist', async () => {
      const fakeTripId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/v1/track/sessions/${fakeTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Trip not found');
    });
  });

  describe('Authentication', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/v1/track/start')
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 if invalid token provided', async () => {
      const response = await request(app)
        .post('/api/v1/track/start')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          tripId: testTrip._id,
          startedAt: new Date().toISOString()
        });

      expect(response.status).toBe(401);
    });
  });
});
