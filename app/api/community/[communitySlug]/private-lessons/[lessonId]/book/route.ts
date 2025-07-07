import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { CreateLessonBookingData } from "@/types/private-lessons";

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string; lessonId: string } }
) {
  try {
    const { communitySlug, lessonId } = params;
    const bookingData: CreateLessonBookingData = await request.json();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get community with Stripe account info
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name, stripe_account_id")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (!community.stripe_account_id) {
      return NextResponse.json(
        { error: "Community payment processing not set up" },
        { status: 400 }
      );
    }

    // Get the private lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("private_lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("community_id", community.id)
      .eq("is_active", true)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Private lesson not found or not available" },
        { status: 404 }
      );
    }

    // Check if user is a community member
    const { data: membership } = await supabase
      .from("community_members")
      .select("id")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const isMember = !!membership;
    const price = isMember && lesson.member_price ? lesson.member_price : lesson.regular_price;

    // Validate booking data
    if (!bookingData.student_email) {
      return NextResponse.json(
        { error: "Student email is required" },
        { status: 400 }
      );
    }

    // Check for existing pending booking
    const { data: existingBooking } = await supabase
      .from("lesson_bookings")
      .select("id")
      .eq("private_lesson_id", lessonId)
      .eq("student_id", user.id)
      .in("payment_status", ["pending"])
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: "You already have a pending booking for this lesson" },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(price * 100), // Convert to cents
        currency: "eur", // You might want to make this configurable
        metadata: {
          type: "private_lesson",
          lesson_id: lessonId,
          community_id: community.id,
          student_id: user.id,
          is_member: isMember.toString(),
        },
        description: `Private Lesson: ${lesson.title} - ${community.name}`,
        receipt_email: bookingData.student_email,
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Create the booking record
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .insert({
        private_lesson_id: lessonId,
        community_id: community.id,
        student_id: user.id,
        student_email: bookingData.student_email,
        student_name: bookingData.student_name,
        is_community_member: isMember,
        price_paid: price,
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: "pending",
        lesson_status: "booked",
        student_message: bookingData.student_message,
        contact_info: bookingData.contact_info || {},
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      
      // Cancel the payment intent if booking creation failed
      try {
        await stripe.paymentIntents.cancel(
          paymentIntent.id,
          { stripeAccount: community.stripe_account_id }
        );
      } catch (cancelError) {
        console.error("Error canceling payment intent:", cancelError);
      }

      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      booking,
      clientSecret: paymentIntent.client_secret,
      stripeAccountId: community.stripe_account_id,
    });
  } catch (error) {
    console.error("Error in POST /api/community/[communitySlug]/private-lessons/[lessonId]/book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 