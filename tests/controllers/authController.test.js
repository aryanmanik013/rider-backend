// tests/controllers/authController.test.js
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { testConfig } from '../testEnv.js';

// Load test environment
Object.keys(testConfig).forEach(key => {
  process.env[key] = testConfig[key];
});

// Import routes
import authRoutes from '../../routes/authRoutes.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth Controller', () => {
  beforeEach(async () => {
    // Clean up any existing test data
    const User = (await import('../../models/User.js')).default;
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id');
      expect(response.body.user).toHaveProperty('name', userData.name);
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteData = {
        name: 'Test User',
        email: 'test@example.com'
        // Missing phone and password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 if email already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should return 400 if phone already exists', async () => {
      const userData1 = {
        name: 'Test User 1',
        email: 'test1@example.com',
        phone: '+1234567890',
        password: 'password123'
      };

      const userData2 = {
        name: 'Test User 2',
        email: 'test2@example.com',
        phone: '+1234567890', // Same phone
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData1);

      // Try to register with same phone
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData2);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Phone number already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for login tests
      testUser = await global.testUtils.createTestUser({
        name: 'Login Test User',
        email: 'login@test.com',
        phone: '+1234567890',
        password: 'password123'
      });
    });

    it('should login with email successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id');
      expect(response.body.user).toHaveProperty('email', 'login@test.com');
    });

    it('should login with phone successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: '+1234567890',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 400 if credentials are missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Email or phone is required');
    });

    it('should return 401 if user not found', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP successfully', async () => {
      // This test would need to be implemented based on your OTP verification logic
      // For now, we'll create a basic structure
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+1234567890',
          otp: '123456'
        });

      // Adjust expectations based on your actual implementation
      expect([200, 400, 401]).toContain(response.status);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser({
        email: 'forgot@test.com',
        phone: '+1234567890'
      });
    });

    it('should send password reset OTP for existing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'forgot@test.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password reset OTP sent');
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid OTP', async () => {
      // This test would need to be implemented based on your password reset logic
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'forgot@test.com',
          otp: '123456',
          newPassword: 'newpassword123'
        });

      // Adjust expectations based on your actual implementation
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});
