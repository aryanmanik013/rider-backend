// tests/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clean up database between tests
beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create test user
  createTestUser: async (userData = {}) => {
    const User = (await import('../models/User.js')).default;
    return await User.create({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      password: 'password123',
      ...userData
    });
  },
  
  // Helper to create test trip
  createTestTrip: async (tripData = {}) => {
    const Trip = (await import('../models/Trip.js')).default;
    return await Trip.create({
      title: 'Test Trip',
      description: 'Test trip description',
      startLocation: { lat: 40.7128, lng: -74.0060 },
      endLocation: { lat: 40.7589, lng: -73.9851 },
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      organizer: tripData.organizer || (await global.testUtils.createTestUser())._id,
      ...tripData
    });
  },
  
  // Helper to generate JWT token
  generateToken: async (userId) => {
    const jwt = (await import('jsonwebtoken')).default;
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h'
    });
  }
};
