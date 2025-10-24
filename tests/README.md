# API Testing Guide

This guide explains how to set up and run automated tests for the Rider Backend API.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev jest supertest @jest/globals mongodb-memory-server
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

## 📁 Test Structure

```
tests/
├── setup.js                    # Test setup and configuration
├── testEnv.js                  # Test environment variables
├── runTests.js                 # Test runner script
├── utils/
│   └── testHelpers.js          # Test utility functions
└── controllers/
    ├── authController.test.js   # Authentication tests
    ├── tripController.test.js   # Trip management tests
    ├── trackingController.test.js # Tracking session tests
    └── userController.test.js   # User profile tests
```

## 🧪 Test Categories

### 1. Authentication Tests (`authController.test.js`)
- User registration
- User login (email/phone)
- OTP verification
- Password reset
- Forgot password

### 2. Trip Management Tests (`tripController.test.js`)
- Create trip
- Get trips (with filters)
- Update trip
- Join trip
- Delete trip

### 3. Tracking Tests (`trackingController.test.js`)
- Start tracking session
- Stop tracking session
- Get tracking sessions
- Session validation

### 4. User Profile Tests (`userController.test.js`)
- Get user profile
- Update profile
- Change password
- Upload avatar
- User stats
- Achievements
- Friends management

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- ES modules support
- MongoDB Memory Server for database testing
- Coverage reporting
- Test timeout settings

### Test Setup (`tests/setup.js`)
- In-memory MongoDB instance
- Database cleanup between tests
- Global test utilities

### Test Environment (`tests/testEnv.js`)
- Test-specific environment variables
- Mock external services
- Test database configuration

## 🛠️ Test Utilities

### TestHelpers Class
The `TestHelpers` class provides utility methods for creating test data:

```javascript
import { TestHelpers } from './utils/testHelpers.js';

// Create test user
const user = await TestHelpers.createTestUser({
  name: 'Test User',
  email: 'test@example.com'
});

// Create test trip
const trip = await TestHelpers.createTestTrip({
  title: 'Test Trip',
  organizer: user._id
});

// Generate auth token
const token = TestHelpers.generateToken(user._id);
```

### Available Helper Methods
- `createTestUser(userData)` - Create test user
- `createTestTrip(tripData)` - Create test trip
- `createTestTrackingSession(sessionData)` - Create tracking session
- `createTestPost(postData)` - Create test post
- `createTestEvent(eventData)` - Create test event
- `createTestService(serviceData)` - Create test service
- `createTestNotification(notificationData)` - Create notification
- `createTestAchievement(achievementData)` - Create achievement
- `createTestPayment(paymentData)` - Create payment
- `createTestSubscription(subscriptionData)` - Create subscription
- `createTestMedia(mediaData)` - Create media
- `createTestMessage(messageData)` - Create message
- `generateToken(userId)` - Generate JWT token
- `cleanupTestData()` - Clean up all test data

## 📊 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/controllers/authController.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should login"
```

### Watch Mode
```bash
npm run test:watch
```
Runs tests in watch mode, re-running when files change.

### Coverage Report
```bash
npm run test:coverage
```
Generates coverage report in `coverage/` directory.

### CI/CD Mode
```bash
npm run test:ci
```
Runs tests in CI mode with coverage and no watch.

## 🎯 Writing Tests

### Test Structure
```javascript
describe('Controller Name', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Setup test data
    testUser = await TestHelpers.createTestUser();
    authToken = TestHelpers.generateToken(testUser._id);
  });

  describe('POST /api/endpoint', () => {
    it('should handle request successfully', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should return error for invalid data', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` to set up fresh data
3. **Descriptive Names**: Use clear, descriptive test names
4. **Assertions**: Test both success and error cases
5. **Mocking**: Mock external services when needed

## 🔍 Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Mode
```bash
npm test -- --detectOpenHandles
```

### Run Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

## 📈 Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🚨 Common Issues

### 1. Database Connection Issues
- Ensure MongoDB Memory Server is properly configured
- Check test environment variables

### 2. Authentication Errors
- Verify JWT secret is set in test environment
- Check token generation and validation

### 3. Import/Export Issues
- Ensure ES modules are properly configured
- Check file extensions and import paths

### 4. Timeout Issues
- Increase test timeout in Jest configuration
- Check for hanging promises or database connections

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use TestHelpers for data creation
3. Test both success and error cases
4. Update this documentation if needed
5. Ensure tests pass before submitting PR
