#!/usr/bin/env node

/**
 * Stripe Custom Onboarding API Test Suite
 * 
 * This script tests all the custom Stripe onboarding endpoints
 * in sequence to verify they're working correctly.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000', // Change this to your domain for production testing
  communityId: '1e9aec95-1006-40b2-aa50-5a8db69fdf32', // Test_Month community
  jwtToken: null, // Will be prompted if not set
  country: 'US',
  businessType: 'individual'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Helper function to log with colors
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Helper function to format JSON
function formatJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// Test functions
class StripeAPITester {
  constructor() {
    this.accountId = null;
    this.testResults = [];
  }

  async runAllTests() {
    log('\n🧪 STRIPE CUSTOM ONBOARDING API TEST SUITE', 'bright');
    log('='.repeat(50), 'cyan');
    
    // Check JWT token
    if (!CONFIG.jwtToken) {
      log('\n⚠️  JWT Token not configured. Please add your token to CONFIG.jwtToken', 'yellow');
      log('You can get this from your browser\'s developer tools after logging in.', 'yellow');
      process.exit(1);
    }

    try {
      await this.test1_CreateAccount();
      await this.test2_UpdateBusinessInfo();
      await this.test3_UpdatePersonalInfo();
      await this.test4_UpdateBankAccount();
      await this.test5_CheckStatus();
      await this.test6_VerifyAccount();
      
      this.printSummary();
    } catch (error) {
      log(`\n❌ Test suite failed: ${error.message}`, 'red');
      console.error(error);
    }
  }

  async test1_CreateAccount() {
    log('\n1️⃣ Testing Account Creation...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/create`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    const data = {
      communityId: CONFIG.communityId,
      country: CONFIG.country,
      businessType: CONFIG.businessType
    };

    try {
      const response = await makeRequest(options, data);
      
      if (response.statusCode === 200 && response.body.accountId) {
        this.accountId = response.body.accountId;
        log(`✅ Account created successfully!`, 'green');
        log(`   Account ID: ${this.accountId}`, 'green');
        this.testResults.push({ test: 'Create Account', status: 'PASS', accountId: this.accountId });
      } else {
        log(`❌ Account creation failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Create Account', status: 'FAIL', error: response.body });
        throw new Error('Account creation failed');
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Create Account', status: 'ERROR', error: error.message });
      throw error;
    }
  }

  async test2_UpdateBusinessInfo() {
    if (!this.accountId) {
      log('⏭️  Skipping business info test (no account ID)', 'yellow');
      return;
    }

    log('\n2️⃣ Testing Business Info Update...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/${this.accountId}/update`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    const data = {
      step: 'business_info',
      currentStep: 2,
      businessInfo: {
        type: 'individual',
        name: 'Test Dance Academy API',
        address: {
          line1: '123 Dance Street',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US'
        },
        phone: '+1234567890',
        website: 'https://testdanceacademy.com',
        mcc: '8299'
      }
    };

    try {
      const response = await makeRequest(options, data);
      
      if (response.statusCode === 200 && response.body.success) {
        log(`✅ Business info updated successfully!`, 'green');
        log(`   Requirements due: ${response.body.requirements?.currentlyDue?.length || 0}`, 'green');
        this.testResults.push({ test: 'Update Business Info', status: 'PASS' });
      } else {
        log(`❌ Business info update failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Update Business Info', status: 'FAIL', error: response.body });
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Update Business Info', status: 'ERROR', error: error.message });
    }
  }

  async test3_UpdatePersonalInfo() {
    if (!this.accountId) {
      log('⏭️  Skipping personal info test (no account ID)', 'yellow');
      return;
    }

    log('\n3️⃣ Testing Personal Info Update...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/${this.accountId}/update`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    const data = {
      step: 'personal_info',
      currentStep: 3,
      personalInfo: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe.test@testdanceacademy.com',
        phone: '+1234567890',
        dob: {
          day: 15,
          month: 8,
          year: 1985
        },
        address: {
          line1: '123 Dance Street',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US'
        },
        ssn_last_4: '1234'
      }
    };

    try {
      const response = await makeRequest(options, data);
      
      if (response.statusCode === 200 && response.body.success) {
        log(`✅ Personal info updated successfully!`, 'green');
        log(`   Requirements due: ${response.body.requirements?.currentlyDue?.length || 0}`, 'green');
        this.testResults.push({ test: 'Update Personal Info', status: 'PASS' });
      } else {
        log(`❌ Personal info update failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Update Personal Info', status: 'FAIL', error: response.body });
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Update Personal Info', status: 'ERROR', error: error.message });
    }
  }

  async test4_UpdateBankAccount() {
    if (!this.accountId) {
      log('⏭️  Skipping bank account test (no account ID)', 'yellow');
      return;
    }

    log('\n4️⃣ Testing Bank Account Update...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/${this.accountId}/update`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    const data = {
      step: 'bank_account',
      currentStep: 4,
      bankAccount: {
        account_number: '000123456789',
        routing_number: '110000000',
        account_holder_name: 'John Doe',
        account_holder_type: 'individual',
        country: 'US',
        currency: 'usd'
      }
    };

    try {
      const response = await makeRequest(options, data);
      
      if (response.statusCode === 200 && response.body.success) {
        log(`✅ Bank account updated successfully!`, 'green');
        log(`   Requirements due: ${response.body.requirements?.currentlyDue?.length || 0}`, 'green');
        this.testResults.push({ test: 'Update Bank Account', status: 'PASS' });
      } else {
        log(`❌ Bank account update failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Update Bank Account', status: 'FAIL', error: response.body });
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Update Bank Account', status: 'ERROR', error: error.message });
    }
  }

  async test5_CheckStatus() {
    if (!this.accountId) {
      log('⏭️  Skipping status check (no account ID)', 'yellow');
      return;
    }

    log('\n5️⃣ Testing Status Check...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/${this.accountId}/status`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    try {
      const response = await makeRequest(options);
      
      if (response.statusCode === 200 && response.body.accountId) {
        log(`✅ Status check successful!`, 'green');
        log(`   Completion: ${response.body.completionPercentage || 0}%`, 'green');
        log(`   Charges enabled: ${response.body.charges_enabled}`, 'green');
        log(`   Payouts enabled: ${response.body.payouts_enabled}`, 'green');
        log(`   Requirements due: ${response.body.requirements?.currentlyDue?.length || 0}`, 'green');
        this.testResults.push({ test: 'Status Check', status: 'PASS', completion: response.body.completionPercentage });
      } else {
        log(`❌ Status check failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Status Check', status: 'FAIL', error: response.body });
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Status Check', status: 'ERROR', error: error.message });
    }
  }

  async test6_VerifyAccount() {
    if (!this.accountId) {
      log('⏭️  Skipping verification (no account ID)', 'yellow');
      return;
    }

    log('\n6️⃣ Testing Account Verification...', 'blue');
    
    const url = new URL(`${CONFIG.baseUrl}/api/stripe/custom-account/${this.accountId}/verify`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.jwtToken}`
      }
    };

    try {
      const response = await makeRequest(options);
      
      if (response.statusCode === 200) {
        if (response.body.verified) {
          log(`✅ Account fully verified!`, 'green');
          log(`   Charges enabled: ${response.body.charges_enabled}`, 'green');
          log(`   Payouts enabled: ${response.body.payouts_enabled}`, 'green');
          this.testResults.push({ test: 'Account Verification', status: 'PASS', verified: true });
        } else {
          log(`⚠️  Account verification incomplete (expected):`, 'yellow');
          log(`   Missing: ${response.body.requirements?.missing?.join(', ') || 'Various requirements'}`, 'yellow');
          log(`   Next steps: ${response.body.nextSteps?.join(', ') || 'Complete requirements'}`, 'yellow');
          this.testResults.push({ test: 'Account Verification', status: 'PASS', verified: false, note: 'Incomplete as expected' });
        }
      } else {
        log(`❌ Verification check failed:`, 'red');
        log(`   Status: ${response.statusCode}`, 'red');
        log(`   Response: ${formatJson(response.body)}`, 'red');
        this.testResults.push({ test: 'Account Verification', status: 'FAIL', error: response.body });
      }
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'red');
      this.testResults.push({ test: 'Account Verification', status: 'ERROR', error: error.message });
    }
  }

  printSummary() {
    log('\n📊 TEST SUMMARY', 'bright');
    log('='.repeat(50), 'cyan');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      const color = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';
      log(`${icon} ${result.test}: ${result.status}`, color);
    });
    
    log(`\n📈 Results: ${passed} passed, ${failed} failed, ${errors} errors`, 'bright');
    
    if (this.accountId) {
      log(`\n🔑 Created Account ID: ${this.accountId}`, 'cyan');
      log('💡 You can use this account ID for further testing or cleanup.', 'cyan');
    }
    
    if (passed === this.testResults.length) {
      log('\n🎉 All tests passed! The API is working correctly.', 'green');
    } else if (failed > 0) {
      log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
    } else {
      log('\n❌ Tests encountered errors. Check your configuration.', 'red');
    }
  }
}

// Main execution
async function main() {
  const tester = new StripeAPITester();
  await tester.runAllTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = StripeAPITester; 