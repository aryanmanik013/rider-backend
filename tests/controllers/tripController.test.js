// tests/controllers/tripController.test.js
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { testConfig } from '../testEnv.js';

// Load test environment
Object.keys(testConfig).forEach(key => {
  process.env[key] = testConfig[key];
});

// Import routes
import tripRoutes from '../../routes/tripRoutes.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/trips', tripRoutes);

describe('Trip Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser({
      name: 'Trip Organizer',
      email: 'organizer@test.com',
      phone: '+1234567890'
    });

    // Generate auth token
    authToken = await global.testUtils.generateToken(testUser._id);
  });

  describe('POST /api/v1/trips', () => {
    it('should create a new trip successfully', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'A test trip for testing',
        startLocation: {
          lat: 40.7128,
          lng: -74.0060,
          address: 'New York, NY'
        },
        endLocation: {
          lat: 40.7589,
          lng: -73.9851,
          address: 'Times Square, NY'
        },
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        maxParticipants: 10,
        difficulty: 'medium',
        distance: 15.5
      };

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tripData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Trip created successfully');
      expect(response.body).toHaveProperty('trip');
      expect(response.body.trip).toHaveProperty('_id');
      expect(response.body.trip).toHaveProperty('title', tripData.title);
      expect(response.body.trip).toHaveProperty('organizer', testUser._id.toString());
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteData = {
        title: 'Test Trip'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 if no token provided', async () => {
      const tripData = {
        title: 'Test Trip',
        description: 'A test trip',
        startLocation: { lat: 40.7128, lng: -74.0060 },
        endLocation: { lat: 40.7589, lng: -73.9851 },
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/v1/trips')
        .send(tripData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/trips', () => {
    beforeEach(async () => {
      // Create some test trips
      await global.testUtils.createTestTrip({
        title: 'Trip 1',
        organizer: testUser._id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await global.testUtils.createTestTrip({
        title: 'Trip 2',
        organizer: testUser._id,
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000)
      });
    });

    it('should get all trips successfully', async () => {
      const response = await request(app)
        .get('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trips');
      expect(Array.isArray(response.body.trips)).toBe(true);
      expect(response.body.trips.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter trips by status', async () => {
      const response = await request(app)
        .get('/api/v1/trips?status=upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trips');
      expect(Array.isArray(response.body.trips)).toBe(true);
    });

    it('should filter trips by location', async () => {
      const response = await request(app)
        .get('/api/v1/trips?lat=40.7128&lng=-74.0060&radius=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trips');
      expect(Array.isArray(response.body.trips)).toBe(true);
    });
  });

  describe('GET /api/v1/trips/:id', () => {
    let testTrip;

    beforeEach(async () => {
      testTrip = await global.testUtils.createTestTrip({
        title: 'Specific Trip',
        organizer: testUser._id
      });
    });

    it('should get trip by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/trips/${testTrip._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trip');
      expect(response.body.trip).toHaveProperty('_id', testTrip._id.toString());
      expect(response.body.trip).toHaveProperty('title', 'Specific Trip');
    });

    it('should return 404 if trip not found', async () => {
      const fakeTripId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/v1/trips/${fakeTripId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Trip not found');
    });
  });

  describe('PUT /api/v1/trips/:id', () => {
    let testTrip;

    beforeEach(async () => {
      testTrip = await global.testUtils.createTestTrip({
        title: 'Original Trip',
        organizer: testUser._id
      });
    });

    it('should update trip successfully', async () => {
      const updateData = {
        title: 'Updated Trip Title',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/trips/${testTrip._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Trip updated successfully');
      expect(response.body).toHaveProperty('trip');
      expect(response.body.trip).toHaveProperty('title', 'Updated Trip Title');
    });

    it('should return 403 if user is not the organizer', async () => {
      // Create another user
      const otherUser = await global.testUtils.createTestUser({
        email: 'other@test.com'
      });
      const otherToken = await global.testUtils.generateToken(otherUser._id);

      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/v1/trips/${testTrip._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Only the organizer can update this trip');
    });

    it('should return 404 if trip not found', async () => {
      const fakeTripId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/v1/trips/${fakeTripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Trip not found');
    });
  });

  describe('POST /api/v1/trips/:id/join', () => {
    let testTrip;
    let otherUser;
    let otherToken;

    beforeEach(async () => {
      testTrip = await global.testUtils.createTestTrip({
        title: 'Joinable Trip',
        organizer: testUser._id
      });

      otherUser = await global.testUtils.createTestUser({
        email: 'joiner@test.com'
      });
      otherToken = await global.testUtils.generateToken(otherUser._id);
    });

    it('should join trip successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${testTrip._id}/join`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Join request sent successfully');
    });

    it('should return 400 if user is already a participant', async () => {
      // First join
      await request(app)
        .post(`/api/v1/trips/${testTrip._id}/join`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Try to join again
      const response = await request(app)
        .post(`/api/v1/trips/${testTrip._id}/join`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'You are already a participant in this trip');
    });

    it('should return 400 if organizer tries to join their own trip', async () => {
      const response = await request(app)
        .post(`/api/v1/trips/${testTrip._id}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'You cannot join your own trip');
    });
  });

  describe('DELETE /api/v1/trips/:id', () => {
    let testTrip;

    beforeEach(async () => {
      testTrip = await global.testUtils.createTestTrip({
        title: 'Deletable Trip',
        organizer: testUser._id
      });
    });

    it('should delete trip successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/trips/${testTrip._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Trip deleted successfully');
    });

    it('should return 403 if user is not the organizer', async () => {
      const otherUser = await global.testUtils.createTestUser({
        email: 'other@test.com'
      });
      const otherToken = await global.testUtils.generateToken(otherUser._id);

      const response = await request(app)
        .delete(`/api/v1/trips/${testTrip._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message', 'Only the organizer can delete this trip');
    });
  });
});
