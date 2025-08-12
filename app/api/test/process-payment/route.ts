import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase";
import { createVideoRoomForBooking } from "@/lib/video-room-creation";

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const { paymentIntentId, stripeAccountId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment Intent ID is required" },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching payment intent from Stripe:', paymentIntentId);

    // Fetch the actual payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    );

    console.log('💳 Payment Intent metadata:', paymentIntent.metadata);

    if (!paymentIntent.metadata?.type || paymentIntent.metadata.type !== 'private_lesson') {
      return NextResponse.json(
        { error: "Not a private lesson payment" },
        { status: 400 }
      );
    }

    const metadata = paymentIntent.metadata;

    // Validate required metadata
    const requiredFields = ['lesson_id', 'community_id', 'student_id', 'student_email', 'price_paid'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return NextResponse.json(
          { error: `Missing required metadata field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Parse contact_info JSON if it exists
    let contactInfo = {};
    try {
      contactInfo = metadata.contact_info ? JSON.parse(metadata.contact_info) : {};
    } catch (e) {
      console.warn('Failed to parse contact_info, using empty object');
    }

    // Create the booking record
    const { data: newBooking, error: bookingCreateError } = await supabase
      .from('lesson_bookings')
      .insert({
        private_lesson_id: metadata.lesson_id,
        community_id: metadata.community_id,
        student_id: metadata.student_id,
        student_email: metadata.student_email,
        student_name: metadata.student_name || '',
        is_community_member: metadata.is_member === 'true',
        price_paid: parseFloat(metadata.price_paid),
        stripe_payment_intent_id: paymentIntentId,
        payment_status: 'succeeded',
        lesson_status: 'booked',
        student_message: metadata.student_message || '',
        contact_info: contactInfo,
        daily_room_name: null,
        daily_room_url: null,
        daily_room_created_at: null,
        daily_room_expires_at: null,
        teacher_daily_token: null,
        student_daily_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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
      paymentIntentId: paymentIntentId,
      message: 'Booking created successfully from payment intent'
    });

  } catch (error) {
    console.error('Error processing payment intent:', error);
    return NextResponse.json(
      { error: `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
