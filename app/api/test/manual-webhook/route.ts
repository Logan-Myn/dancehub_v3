import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createVideoRoomForBooking } from "@/lib/video-room-creation";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment Intent ID is required" },
        { status: 400 }
      );
    }

    console.log('🔄 Manually processing payment intent:', paymentIntentId);

    // Simulate webhook processing - we'll need to get the payment intent metadata
    // For testing, let's create a booking with test data
    const testBookingData = {
      private_lesson_id: 'd4bf244e-18c1-45c7-ac17-e9792576f2ef', // Your lesson ID
      community_id: 'fa0051dc-f56e-45a8-8607-9c71107abb4a', // Your community ID
      student_id: 'e39865bd-4ba3-4727-97d2-152f12d126ec', // Your user ID
      student_email: 'logan.moyon15@gmail.com',
      student_name: 'Logan Test',
      is_community_member: true,
      price_paid: 30,
      stripe_payment_intent_id: paymentIntentId,
      payment_status: 'succeeded',
      lesson_status: 'booked',
      student_message: 'Test booking with new flow',
      contact_info: { phone: '', preferred_contact: 'email' },
      daily_room_name: null,
      daily_room_url: null,
      daily_room_created_at: null,
      daily_room_expires_at: null,
      teacher_daily_token: null,
      student_daily_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create the booking record
    const { data: newBooking, error: bookingCreateError } = await supabase
      .from('lesson_bookings')
      .insert(testBookingData)
      .select('id')
      .single();

    if (bookingCreateError || !newBooking) {
      console.error('❌ Error creating booking record:', bookingCreateError);
      return NextResponse.json(
        { error: `Failed to create booking: ${bookingCreateError?.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Successfully created new booking:', newBooking.id);

    // Create video room
    try {
      console.log('🎬 Creating video room for booking:', newBooking.id);
      await createVideoRoomForBooking(newBooking.id);
      console.log('✅ Video room created successfully for booking:', newBooking.id);
    } catch (videoError) {
      console.error('❌ Error creating video room (non-critical):', videoError);
    }

    return NextResponse.json({
      success: true,
      bookingId: newBooking.id,
      message: 'Booking created successfully with video room'
    });

  } catch (error) {
    console.error('Error processing manual webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
