// tests/testEnv.js
// Test environment configuration
export const testConfig = {
  // Database
  MONGO_URI: 'mongodb://localhost:27017/rider-test',
  
  // JWT
  JWT_SECRET: 'test-jwt-secret-key',
  
  // Cloudinary (optional for tests)
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
  
  // Twilio (optional for tests)
  TWILIO_ACCOUNT_SID: 'test-sid',
  TWILIO_AUTH_TOKEN: 'test-token',
  TWILIO_PHONE_NUMBER: '+1234567890',
  
  // Razorpay (optional for tests)
  RAZORPAY_KEY_ID: 'test-key-id',
  RAZORPAY_KEY_SECRET: 'test-key-secret',
  
  // Client URL
  CLIENT_URL: 'http://localhost:3000',
  
  // Server Port
  PORT: 5001
};

// Set test environment variables
Object.keys(testConfig).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = testConfig[key];
  }
});
