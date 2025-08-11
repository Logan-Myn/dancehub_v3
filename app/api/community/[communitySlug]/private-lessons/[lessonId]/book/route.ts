import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { CreateLessonBookingData } from "@/types/private-lessons";
import { 
  createDailyRoom, 
  createMeetingToken, 
  generateRoomName, 
  calculateRoomExpiration 
} from "@/lib/daily";
import { notifyVideoRoomReady } from "@/lib/video-notifications";

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

    // Create Daily.co room for online lessons
    let dailyRoomData = null;
    let teacherToken = null;
    let studentToken = null;

    if (lesson.location_type === 'online' || lesson.location_type === 'both') {
      try {
        const roomName = generateRoomName(lessonId, communitySlug);
        const roomExpiration = calculateRoomExpiration(lesson.duration_minutes);

        // Create the Daily.co room
        const roomConfig = {
          name: roomName,
          privacy: 'private' as const,
          properties: {
            max_participants: 2, // Only teacher and student
            exp: roomExpiration,
            eject_at_room_exp: true,
            enable_chat: true,
            enable_screenshare: true,
            enable_recording: 'cloud' as const,
            start_cloud_recording: false, // Let teacher decide when to record
            owner_only_broadcast: false,
            enable_knocking: true,
            lang: 'en',
          },
        };

        dailyRoomData = await createDailyRoom(roomConfig);

        // Get community creator info for teacher token
        const { data: teacher } = await supabase
          .from("profiles")
          .select("full_name, display_name")
          .eq("id", community.created_by)
          .single();

        // Get student info for student token  
        const { data: studentProfile } = await supabase
          .from("profiles")
          .select("full_name, display_name")
          .eq("id", user.id)
          .single();

        // Create meeting tokens for teacher and student
        const teacherTokenData = await createMeetingToken({
          room_name: roomName,
          user_name: teacher?.display_name || teacher?.full_name || 'Teacher',
          user_id: community.created_by,
          is_owner: true,
          exp: roomExpiration,
          enable_screenshare: true,
          enable_recording: true,
          start_cloud_recording: false,
        });

        const studentTokenData = await createMeetingToken({
          room_name: roomName,
          user_name: studentProfile?.display_name || studentProfile?.full_name || bookingData.student_name || 'Student',
          user_id: user.id,
          is_owner: false,
          exp: roomExpiration,
          enable_screenshare: true,
          enable_recording: false,
          start_cloud_recording: false,
        });

        teacherToken = teacherTokenData.token;
        studentToken = studentTokenData.token;
      } catch (dailyError) {
        console.error("Error creating Daily.co room:", dailyError);
        // Don't fail the booking if Daily.co setup fails
        // The booking can still proceed and video room can be created later
      }
    }

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
        // Daily.co room data
        daily_room_name: dailyRoomData?.name,
        daily_room_url: dailyRoomData?.url,
        daily_room_created_at: dailyRoomData ? new Date().toISOString() : null,
        daily_room_expires_at: dailyRoomData ? new Date(dailyRoomData.config.exp * 1000).toISOString() : null,
        teacher_daily_token: teacherToken,
        student_daily_token: studentToken,
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

    // Send notification if video room was created successfully
    if (dailyRoomData && booking && community) {
      try {
        await notifyVideoRoomReady({
          ...booking,
          lesson_title: lesson.title,
          lesson_description: lesson.description,
          duration_minutes: lesson.duration_minutes,
          regular_price: lesson.regular_price,
          member_price: lesson.member_price,
          community_name: community.name,
          community_slug: communitySlug,
        });
      } catch (notificationError) {
        console.error('Error sending video room notification:', notificationError);
        // Don't fail the booking if notification fails
      }
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