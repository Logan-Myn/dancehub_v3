#!/usr/bin/env node

/**
 * Quick script to verify database schema is correctly set up
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database schema...\n');

    // Check if lesson_bookings has all required columns
    console.log('1️⃣ Checking lesson_bookings table structure...');
    
    // Try to insert a test record to see what columns exist
    const testInsert = {
      private_lesson_id: '00000000-0000-0000-0000-000000000000',
      community_id: '00000000-0000-0000-0000-000000000000',
      student_id: '00000000-0000-0000-0000-000000000000',
      student_email: 'test@example.com',
      price_paid: 50.00,
      payment_status: 'succeeded',
      lesson_status: 'scheduled',
      // Daily.co fields that should exist
      daily_room_name: null,
      daily_room_url: null,
      daily_room_expires_at: null,
      teacher_daily_token: null,
      student_daily_token: null,
      video_call_started_at: null,
      video_call_ended_at: null
    };

    // This will fail due to foreign key constraints, but will tell us about missing columns
    const { error } = await supabase
      .from('lesson_bookings')
      .insert(testInsert);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Missing database columns detected!');
        console.log('   Error:', error.message);
        console.log('\n💡 Solution: Run the Daily.co fields migration:');
        console.log('   npx supabase db push');
        console.log('   OR manually apply: supabase/migrations/add_daily_co_fields.sql');
        return false;
      } else if (error.message.includes('violates foreign key constraint')) {
        console.log('✅ All columns exist (foreign key error is expected)');
      } else {
        console.log('❓ Unexpected error:', error.message);
      }
    }

    // Check if view exists
    console.log('\n2️⃣ Checking lesson_bookings_with_details view...');
    const { data: viewData, error: viewError } = await supabase
      .from('lesson_bookings_with_details')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('❌ View does not exist or has issues:', viewError.message);
      console.log('\n💡 The view may need to be recreated. Check migration files.');
      return false;
    } else {
      console.log('✅ lesson_bookings_with_details view exists');
    }

    // Check RLS policies
    console.log('\n3️⃣ Testing RLS policies...');
    
    // This should work with service role key
    const { data: allBookings, error: rlsError } = await supabase
      .from('lesson_bookings')
      .select('id, student_id, payment_status')
      .limit(5);

    if (rlsError) {
      console.log('❌ RLS policy issue:', rlsError.message);
      return false;
    } else {
      console.log('✅ RLS policies allow service role access');
      console.log(`   Found ${allBookings.length} total booking records`);
    }

    console.log('\n✅ Database schema verification passed!');
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

verifyDatabase()
  .then(success => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));