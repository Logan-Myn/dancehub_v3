#!/usr/bin/env ts-node
/**
 * Stripe Integration Test Script
 *
 * This script tests the Stripe API calls and webhook handling.
 * Run with: npx ts-node scripts/test-stripe-integration.ts
 *
 * Prerequisites:
 * - Set environment variables (STRIPE_SECRET_KEY, DATABASE_URL, etc.)
 * - Have a test community created with Stripe Connect account
 */

import Stripe from 'stripe';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from multiple files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
});

// Initialize database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      message: 'OK',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.error(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

// ============================================================================
// Test 1: Verify Stripe Connection
// ============================================================================
async function testStripeConnection() {
  const account = await stripe.accounts.retrieve();
  if (!account.id) {
    throw new Error('Failed to retrieve Stripe account');
  }
  console.log(`   Connected to Stripe account: ${account.id}`);
}

// ============================================================================
// Test 2: Verify Database Connection
// ============================================================================
async function testDatabaseConnection() {
  const result = await pool.query('SELECT NOW()');
  if (!result.rows[0]) {
    throw new Error('Failed to query database');
  }
  console.log(`   Database time: ${result.rows[0].now}`);
}

// ============================================================================
// Test 3: List Connected Accounts
// ============================================================================
async function testListConnectedAccounts() {
  const result = await pool.query(`
    SELECT id, name, slug, stripe_account_id, status
    FROM communities
    WHERE stripe_account_id IS NOT NULL
    LIMIT 5
  `);

  console.log(`   Found ${result.rows.length} communities with Stripe accounts:`);
  for (const community of result.rows) {
    console.log(`   - ${community.name} (${community.slug}): ${community.stripe_account_id}`);

    // Verify the connected account exists in Stripe
    try {
      const account = await stripe.accounts.retrieve(community.stripe_account_id);
      console.log(`     ✓ Stripe account verified: ${account.email || 'no email'}`);
    } catch (error) {
      console.log(`     ✗ Stripe account invalid: ${error instanceof Error ? error.message : error}`);
    }
  }
}

// ============================================================================
// Test 4: Verify Webhook Endpoint
// ============================================================================
async function testWebhookEndpoint() {
  const response = await fetch(`${BASE_URL}/api/webhooks/stripe/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true }),
  });

  if (!response.ok) {
    throw new Error(`Webhook test endpoint returned ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('Webhook test endpoint did not return success');
  }
  console.log(`   Webhook test endpoint responded: ${data.message}`);
}

// ============================================================================
// Test 5: Test Join-Paid API Endpoint
// ============================================================================
async function testJoinPaidEndpoint() {
  // Get a test community
  const communityResult = await pool.query(`
    SELECT slug FROM communities
    WHERE stripe_account_id IS NOT NULL
    AND membership_price > 0
    LIMIT 1
  `);

  if (communityResult.rows.length === 0) {
    console.log('   ⚠️ No paid community found, skipping');
    return;
  }

  const slug = communityResult.rows[0].slug;
  console.log(`   Testing with community: ${slug}`);

  const response = await fetch(`${BASE_URL}/api/community/${slug}/join-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test-user-id',
      email: 'test@example.com',
    }),
  });

  // We expect an error (user doesn't exist) but endpoint should work
  const data = await response.json();
  console.log(`   Response: ${response.status} - ${JSON.stringify(data)}`);

  if (response.status === 404 && data.error === 'Community not found') {
    throw new Error('Community not found - check if slug is correct');
  }
}

// ============================================================================
// Test 6: Test Pre-Registration API Endpoint
// ============================================================================
async function testPreRegistrationEndpoint() {
  // Get a pre-registration community
  const communityResult = await pool.query(`
    SELECT slug FROM communities
    WHERE status = 'pre_registration'
    LIMIT 1
  `);

  if (communityResult.rows.length === 0) {
    console.log('   ⚠️ No pre-registration community found, skipping');
    return;
  }

  const slug = communityResult.rows[0].slug;
  console.log(`   Testing with community: ${slug}`);

  const response = await fetch(`${BASE_URL}/api/community/${slug}/join-pre-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test-user-id',
      email: 'test@example.com',
    }),
  });

  const data = await response.json();
  console.log(`   Response: ${response.status} - ${JSON.stringify(data)}`);
}

// ============================================================================
// Test 7: Verify Subscription Data Sync
// ============================================================================
async function testSubscriptionSync() {
  // Get communities with connected accounts
  const communities = await pool.query(`
    SELECT id, stripe_account_id
    FROM communities
    WHERE stripe_account_id IS NOT NULL
  `);

  let totalDbSubscriptions = 0;
  let totalStripeSubscriptions = 0;

  for (const community of communities.rows) {
    // Count DB subscriptions
    const dbResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM community_members
      WHERE community_id = $1 AND subscription_status = 'active'
    `, [community.id]);
    totalDbSubscriptions += parseInt(dbResult.rows[0].count);

    // Count Stripe subscriptions
    try {
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
      }, {
        stripeAccount: community.stripe_account_id,
      });
      totalStripeSubscriptions += subscriptions.data.length;
    } catch (error) {
      console.log(`   ⚠️ Could not fetch Stripe subscriptions for ${community.stripe_account_id}`);
    }
  }

  console.log(`   Database active subscriptions: ${totalDbSubscriptions}`);
  console.log(`   Stripe active subscriptions: ${totalStripeSubscriptions}`);

  if (totalDbSubscriptions !== totalStripeSubscriptions) {
    console.log(`   ⚠️ Subscription count mismatch - may need sync`);
  }
}

// ============================================================================
// Test 8: Simulate Webhook Event (Local Only)
// ============================================================================
async function testSimulateWebhook() {
  // This simulates what a webhook payload looks like
  // Note: This won't pass signature verification in production
  const mockEvent = {
    id: 'evt_test_' + Date.now(),
    object: 'event',
    type: 'payment_intent.succeeded',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'pi_test_' + Date.now(),
        object: 'payment_intent',
        amount: 2999,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          type: 'test_simulation',
        },
      },
    },
  };

  console.log(`   Mock event type: ${mockEvent.type}`);
  console.log(`   Mock event ID: ${mockEvent.id}`);

  // In development, you might want to test with stripe CLI:
  // stripe trigger payment_intent.succeeded
  console.log('   💡 Tip: Use Stripe CLI for real webhook testing:');
  console.log('      stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('      stripe trigger payment_intent.succeeded');
}

// ============================================================================
// Test 9: Check Environment Variables
// ============================================================================
async function testEnvironmentVariables() {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_CONNECT_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
      // Show partial value for verification
      const value = process.env[varName]!;
      const masked = value.substring(0, 7) + '...' + value.substring(value.length - 4);
      console.log(`   ✓ ${varName}: ${masked}`);
    } else {
      missing.push(varName);
      console.log(`   ✗ ${varName}: NOT SET`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// ============================================================================
// Test 10: Full Flow Simulation (Database Only)
// ============================================================================
async function testFullFlowSimulation() {
  console.log('   Simulating subscription flow (database operations only)...');

  // Get a test community
  const communityResult = await pool.query(`
    SELECT id, name, stripe_account_id
    FROM communities
    WHERE stripe_account_id IS NOT NULL
    LIMIT 1
  `);

  if (communityResult.rows.length === 0) {
    console.log('   ⚠️ No community with Stripe account found');
    return;
  }

  const community = communityResult.rows[0];
  console.log(`   Using community: ${community.name}`);

  // Create a test member record (simulating what webhook would do)
  const testUserId = `test-user-${Date.now()}`;
  const testCustomerId = `cus_test_${Date.now()}`;
  const testSubscriptionId = `sub_test_${Date.now()}`;

  try {
    // Insert test member
    await pool.query(`
      INSERT INTO community_members (
        community_id, user_id, joined_at, role, status,
        subscription_status, stripe_customer_id, stripe_subscription_id,
        platform_fee_percentage
      ) VALUES ($1, $2, NOW(), 'member', 'active', 'active', $3, $4, 0)
    `, [community.id, testUserId, testCustomerId, testSubscriptionId]);

    console.log(`   ✓ Created test member record`);

    // Verify it was created
    const verifyResult = await pool.query(`
      SELECT * FROM community_members
      WHERE user_id = $1 AND community_id = $2
    `, [testUserId, community.id]);

    if (verifyResult.rows.length === 0) {
      throw new Error('Test member record not found after insert');
    }
    console.log(`   ✓ Verified member record exists`);

    // Clean up - delete test record
    await pool.query(`
      DELETE FROM community_members
      WHERE user_id = $1 AND community_id = $2
    `, [testUserId, community.id]);

    console.log(`   ✓ Cleaned up test member record`);
  } catch (error) {
    // Clean up on error
    await pool.query(`
      DELETE FROM community_members
      WHERE user_id = $1
    `, [testUserId]).catch(() => {});
    throw error;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('');
  console.log('🧪 Stripe Integration Test Suite');
  console.log('================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Stripe Mode: ${STRIPE_SECRET_KEY.startsWith('sk_live') ? '🔴 LIVE' : '🟢 TEST'}`);
  console.log('');

  // Run all tests
  await runTest('1. Stripe Connection', testStripeConnection);
  await runTest('2. Database Connection', testDatabaseConnection);
  await runTest('3. Environment Variables', testEnvironmentVariables);
  await runTest('4. List Connected Accounts', testListConnectedAccounts);
  await runTest('5. Webhook Endpoint', testWebhookEndpoint);
  await runTest('6. Join-Paid Endpoint', testJoinPaidEndpoint);
  await runTest('7. Pre-Registration Endpoint', testPreRegistrationEndpoint);
  await runTest('8. Subscription Sync Check', testSubscriptionSync);
  await runTest('9. Webhook Simulation Info', testSimulateWebhook);
  await runTest('10. Full Flow Simulation', testFullFlowSimulation);

  // Print summary
  console.log('');
  console.log('================================');
  console.log('Test Summary');
  console.log('================================');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('Failed Tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  ❌ ${result.name}: ${result.message}`);
    }
  }

  console.log('');
  console.log('💡 Next Steps for Live Testing:');
  console.log('');
  console.log('1. Use Stripe CLI for webhook testing:');
  console.log('   stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('');
  console.log('2. Trigger test events:');
  console.log('   stripe trigger payment_intent.succeeded');
  console.log('   stripe trigger customer.subscription.created');
  console.log('   stripe trigger invoice.payment_succeeded');
  console.log('');
  console.log('3. Run E2E tests:');
  console.log('   bun run test:e2e -- e2e/stripe-integration.spec.ts');
  console.log('');

  // Close database connection
  await pool.end();

  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
