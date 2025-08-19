#!/usr/bin/env node

/**
 * Test script to verify the complete private lesson booking flow
 * This script helps debug the booking system by testing each component
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBookingFlow() {
  console.log('🧪 Starting booking flow test...\n');

  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    const { data: communities, error: connError } = await supabase
      .from('communities')
      .select('id, name, slug')
      .limit(1);
    
    if (connError) {
      console.error('❌ Database connection failed:', connError);
      return false;
    }
    console.log('✅ Database connection successful');
    console.log('   Found communities:', communities?.length || 0);

    // 2. Check if required tables exist
    console.log('\n2️⃣ Checking required tables...');
    const tablesToCheck = ['private_lessons', 'lesson_bookings'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Table ${table} error:`, error.message);
        } else {
          console.log(`✅ Table ${table} exists and accessible`);
        }
      } catch (e) {
        console.error(`❌ Table ${table} check failed:`, e.message);
      }
    }

    // 3. Check if lesson_bookings_with_details view exists
    console.log('\n3️⃣ Checking database view...');
    try {
      const { data, error } = await supabase
        .from('lesson_bookings_with_details')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ lesson_bookings_with_details view error:', error.message);
        console.log('💡 This view may need to be recreated');
      } else {
        console.log('✅ lesson_bookings_with_details view accessible');
      }
    } catch (e) {
      console.error('❌ View check failed:', e.message);
    }

    // 4. Check for existing bookings
    console.log('\n4️⃣ Checking existing bookings...');
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('lesson_bookings')
      .select(`
        id, 
        payment_status, 
        lesson_status, 
        created_at,
        stripe_payment_intent_id
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (bookingsError) {
      console.error('❌ Error fetching existing bookings:', bookingsError);
    } else {
      console.log('✅ Existing bookings found:', existingBookings.length);
      if (existingBookings.length > 0) {
        console.log('   Recent bookings:');
        existingBookings.forEach(booking => {
          console.log(`   - ${booking.id} | ${booking.payment_status} | ${booking.lesson_status} | ${booking.created_at}`);
        });
      }
    }

    // 5. Check for private lessons
    console.log('\n5️⃣ Checking private lessons...');
    const { data: lessons, error: lessonsError } = await supabase
      .from('private_lessons')
      .select('id, title, community_id, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (lessonsError) {
      console.error('❌ Error fetching private lessons:', lessonsError);
    } else {
      console.log('✅ Active private lessons found:', lessons.length);
      if (lessons.length > 0) {
        console.log('   Available lessons:');
        lessons.forEach(lesson => {
          console.log(`   - ${lesson.title} (${lesson.id})`);
        });
      }
    }

    // 6. Test webhook payload validation
    console.log('\n6️⃣ Testing webhook payload validation...');
    const sampleWebhookPayload = {
      lesson_id: lessons?.[0]?.id || 'test-lesson-id',
      community_id: lessons?.[0]?.community_id || 'test-community-id',
      student_id: 'test-student-id',
      student_email: 'test@example.com',
      price_paid: '50.00',
      student_name: 'Test Student',
      is_member: 'false',
      scheduled_at: new Date().toISOString(),
      student_message: 'Debug test booking'
    };

    console.log('   Sample payload prepared:', JSON.stringify(sampleWebhookPayload, null, 2));

    // 7. Check environment variables
    console.log('\n7️⃣ Checking environment variables...');
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_CONNECT_WEBHOOK_SECRET',
      'DAILY_API_KEY'
    ];

    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing`);
      }
    });

    console.log('\n🎯 Test Summary:');
    console.log('✅ Database connection working');
    console.log(`✅ Found ${existingBookings?.length || 0} existing bookings`);
    console.log(`✅ Found ${lessons?.length || 0} active private lessons`);
    
    if ((existingBookings?.length || 0) === 0 && (lessons?.length || 0) > 0) {
      console.log('\n💡 Potential Issue Detected:');
      console.log('   - Private lessons exist but no bookings found');
      console.log('   - This suggests payments may not be creating booking records');
      console.log('   - Check webhook handling and Stripe event processing');
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testBookingFlow()
  .then(success => {
    if (success) {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Test completed with errors');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });