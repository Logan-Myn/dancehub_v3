const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupPendingBookings() {
  try {
    console.log('🧹 Cleaning up pending bookings...');
    
    // Find all pending bookings
    const { data: pendingBookings, error: fetchError } = await supabase
      .from('lesson_bookings')
      .select('id, student_name, stripe_payment_intent_id, created_at')
      .eq('payment_status', 'pending');

    if (fetchError) {
      console.error('Error fetching pending bookings:', fetchError);
      return;
    }

    if (!pendingBookings || pendingBookings.length === 0) {
      console.log('✅ No pending bookings found to clean up');
      return;
    }

    console.log(`Found ${pendingBookings.length} pending bookings:`);
    pendingBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}, Student: ${booking.student_name}, Created: ${booking.created_at}`);
    });

    // Delete all pending bookings
    const { error: deleteError } = await supabase
      .from('lesson_bookings')
      .delete()
      .eq('payment_status', 'pending');

    if (deleteError) {
      console.error('Error deleting pending bookings:', deleteError);
      return;
    }

    console.log(`✅ Successfully deleted ${pendingBookings.length} pending bookings`);
    console.log('🎉 Cleanup complete! Now users can book without conflicts.');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupPendingBookings();
