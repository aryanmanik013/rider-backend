// tests/runTests.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class TestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting API Test Suite...\n');
    
    try {
      // Run Jest tests
      const jestCommand = 'npm test';
      console.log('Running Jest tests...');
      
      execSync(jestCommand, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Tests failed:', error.message);
      process.exit(1);
    }
  }

  async runSpecificTest(testFile) {
    console.log(`🧪 Running specific test: ${testFile}`);
    
    try {
      const jestCommand = `npm test -- ${testFile}`;
      execSync(jestCommand, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Test completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  async runTestsWithCoverage() {
    console.log('📊 Running tests with coverage...');
    
    try {
      const jestCommand = 'npm run test:coverage';
      execSync(jestCommand, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Coverage report generated!');
      
    } catch (error) {
      console.error('\n❌ Coverage test failed:', error.message);
      process.exit(1);
    }
  }

  async runTestsInWatchMode() {
    console.log('👀 Running tests in watch mode...');
    
    try {
      const jestCommand = 'npm run test:watch';
      execSync(jestCommand, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
    } catch (error) {
      console.error('\n❌ Watch mode failed:', error.message);
      process.exit(1);
    }
  }

  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.testResults,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const reportPath = path.join(process.cwd(), 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📋 Test report generated: ${reportPath}`);
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Check if test environment file exists
    const testEnvPath = path.join(process.cwd(), '.env.test');
    if (!fs.existsSync(testEnvPath)) {
      console.log('⚠️  .env.test file not found. Using default test configuration.');
    }
    
    // Check if Jest is installed
    try {
      require.resolve('jest');
      console.log('✅ Jest is installed');
    } catch (error) {
      console.error('❌ Jest is not installed. Please run: npm install --save-dev jest');
      process.exit(1);
    }
    
    // Check if Supertest is installed
    try {
      require.resolve('supertest');
      console.log('✅ Supertest is installed');
    } catch (error) {
      console.error('❌ Supertest is not installed. Please run: npm install --save-dev supertest');
      process.exit(1);
    }
    
    console.log('✅ Test environment setup complete\n');
  }
}

// CLI interface
const args = process.argv.slice(2);
const testRunner = new TestRunner();

async function main() {
  await testRunner.setupTestEnvironment();
  
  if (args.length === 0) {
    // Run all tests
    await testRunner.runAllTests();
  } else {
    const command = args[0];
    
    switch (command) {
      case 'watch':
        await testRunner.runTestsInWatchMode();
        break;
        
      case 'coverage':
        await testRunner.runTestsWithCoverage();
        break;
        
      case 'specific':
        if (args[1]) {
          await testRunner.runSpecificTest(args[1]);
        } else {
          console.error('❌ Please provide a test file path');
          process.exit(1);
        }
        break;
        
      case 'help':
        console.log(`
🧪 Test Runner Commands:

  node tests/runTests.js                    # Run all tests
  node tests/runTests.js watch              # Run tests in watch mode
  node tests/runTests.js coverage           # Run tests with coverage
  node tests/runTests.js specific <file>    # Run specific test file
  node tests/runTests.js help               # Show this help

📁 Available test files:
  - tests/controllers/authController.test.js
  - tests/controllers/tripController.test.js
  - tests/controllers/trackingController.test.js
  - tests/controllers/userController.test.js

🔧 Setup:
  npm install --save-dev jest supertest @jest/globals mongodb-memory-server
        `);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "node tests/runTests.js help" for available commands');
        process.exit(1);
    }
  }
  
  testRunner.generateTestReport();
}

main().catch(console.error);
