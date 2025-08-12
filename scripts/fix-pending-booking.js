const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPendingBooking() {
  try {
    // Find the pending booking
    const { data: pendingBookings, error } = await supabase
      .from('lesson_bookings')
      .select(`
        id,
        stripe_payment_intent_id,
        payment_status,
        private_lesson_id,
        student_name,
        private_lessons(title)
      `)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }

    if (!pendingBookings || pendingBookings.length === 0) {
      console.log('No pending bookings found');
      return;
    }

    console.log('Found pending bookings:');
    pendingBookings.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}`);
      console.log(`   Student: ${booking.student_name}`);
      console.log(`   Lesson: ${booking.private_lessons?.title}`);
      console.log(`   Stripe PaymentIntent: ${booking.stripe_payment_intent_id}`);
      console.log('');
    });

    // For now, let's update the most recent one
    const bookingToUpdate = pendingBookings[0];
    
    console.log(`Updating booking ${bookingToUpdate.id} to succeeded...`);
    
    const { error: updateError } = await supabase
      .from('lesson_bookings')
      .update({ 
        payment_status: 'succeeded',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingToUpdate.id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return;
    }

    console.log('✅ Booking status updated to succeeded');
    
    // Now try to create the video room
    const { createVideoRoomForBooking } = require('../lib/video-room-creation.ts');
    
    try {
      console.log('Creating video room...');
      await createVideoRoomForBooking(bookingToUpdate.id);
      console.log('✅ Video room created successfully');
    } catch (videoError) {
      console.error('❌ Error creating video room:', videoError.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

fixPendingBooking();
