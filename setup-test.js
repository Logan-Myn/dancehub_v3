#!/usr/bin/env node

/**
 * Setup script for Stripe API testing
 * This will help you configure the test environment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 STRIPE API TEST SETUP');
console.log('='.repeat(40));

console.log('\n📋 Pre-test Checklist:');
console.log('');
console.log('1. ✅ Start your development server:');
console.log('   npm run dev');
console.log('');
console.log('2. 🔑 Get your JWT token:');
console.log('   a) Open your browser and go to http://localhost:3000');
console.log('   b) Log in to your application');
console.log('   c) Open Developer Tools (F12)');
console.log('   d) Go to Application/Storage > Local Storage');
console.log('   e) Look for a token (usually named "token", "jwt", "auth", etc.)');
console.log('   f) Copy the token value');
console.log('');
console.log('3. 🔧 Configure the test:');
console.log('   Edit test-stripe-endpoints.js');
console.log('   Find CONFIG.jwtToken and paste your token');
console.log('');
console.log('4. 🧪 Run the tests:');
console.log('   node test-stripe-endpoints.js');
console.log('');

// Check if Next.js is running
console.log('🔍 Checking if Next.js server is running...');

const http = require('http');

const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

checkServer().then(isRunning => {
  if (isRunning) {
    console.log('✅ Next.js server is running on http://localhost:3000');
  } else {
    console.log('❌ Next.js server is not running. Please start it with:');
    console.log('   npm run dev');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Get your JWT token from the browser');
  console.log('2. Edit test-stripe-endpoints.js and add the token');
  console.log('3. Run: node test-stripe-endpoints.js');
  console.log('\n💡 Need help? Check API_TESTING_GUIDE.md for detailed instructions.');
});

// Create a quick token helper
console.log('\n📝 Quick Token Setup:');
console.log('If you know your token, you can set it directly by running:');
console.log('');
console.log('TOKEN="your_jwt_token_here" node test-stripe-endpoints.js');
console.log('');
console.log('Or edit the CONFIG object in test-stripe-endpoints.js');

// Check if we have environment variable
if (process.env.TOKEN) {
  console.log('\n🔑 Found TOKEN environment variable!');
  console.log('Updating test configuration...');
  
  // Read the test file
  let testFile = fs.readFileSync('test-stripe-endpoints.js', 'utf8');
  
  // Replace the jwtToken line
  testFile = testFile.replace(
    'jwtToken: null,',
    `jwtToken: '${process.env.TOKEN}',`
  );
  
  // Write it back
  fs.writeFileSync('test-stripe-endpoints.js', testFile);
  
  console.log('✅ Test file updated! You can now run:');
  console.log('   node test-stripe-endpoints.js');
} 