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

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get community with Stripe account info
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name, stripe_account_id, created_by")
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
      .select("*, communities!inner(created_by)")
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

    if (!bookingData.scheduled_at) {
      return NextResponse.json(
        { error: "Scheduled time is required" },
        { status: 400 }
      );
    }

    // Check for existing pending booking - REMOVED
    // No more pre-booking! Booking will be created only after payment succeeds

    // Store booking data in PaymentIntent metadata for webhook processing
    const privateLessonFeePercentage = 5.0; // 5% platform fee for private lessons
    
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(price * 100), // Convert to cents
        currency: "eur", // You might want to make this configurable
        application_fee_amount: Math.round((price * privateLessonFeePercentage / 100) * 100), // 5% platform fee in cents
        metadata: {
          type: "private_lesson",
          lesson_id: lessonId,
          community_id: community.id,
          student_id: user.id,
          student_email: bookingData.student_email,
          student_name: bookingData.student_name || "",
          student_message: bookingData.student_message || "",
          contact_info: JSON.stringify(bookingData.contact_info || {}),
          scheduled_at: bookingData.scheduled_at,
          availability_slot_id: bookingData.availability_slot_id || "",
          is_member: isMember.toString(),
          price_paid: price.toString(),
          platform_fee_percentage: privateLessonFeePercentage.toString(),
          platform_fee_amount: (price * privateLessonFeePercentage / 100).toString(),
        },
        description: `Private Lesson: ${lesson.title} - ${community.name}`,
        receipt_email: bookingData.student_email,
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Return only payment information - no booking created yet!
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      stripeAccountId: community.stripe_account_id,
      paymentIntentId: paymentIntent.id,
      lesson: {
        title: lesson.title,
        price: price,
        isMember: isMember
      }
    });
  } catch (error) {
    console.error("Error in POST /api/community/[communitySlug]/private-lessons/[lessonId]/book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 