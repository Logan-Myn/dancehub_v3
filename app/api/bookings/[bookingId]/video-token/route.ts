import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createMeetingToken } from "@/lib/daily";

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    console.log("Video token request for booking:", bookingId);

    // Check if Daily API key is available
    if (!process.env.DAILY_API_KEY) {
      console.error("DAILY_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "Video service not configured" },
        { status: 503 }
      );
    }

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header");
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

    // Get the booking with lesson and community info
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .select(`
        *,
        private_lessons!inner(
          title,
          duration_minutes,
          communities!inner(
            name,
            slug,
            created_by
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized (student or teacher)
    const isStudent = booking.student_id === user.id;
    const isTeacher = booking.private_lessons.communities.created_by === user.id;

    if (!isStudent && !isTeacher) {
      return NextResponse.json(
        { error: "Not authorized to access this booking" },
        { status: 403 }
      );
    }

    // Check if payment is completed
    if (booking.payment_status !== 'succeeded') {
      return NextResponse.json(
        { error: "Payment must be completed before generating video tokens" },
        { status: 400 }
      );
    }

    // Check if room exists
    if (!booking.daily_room_name) {
      return NextResponse.json(
        { error: "Video room not available for this booking" },
        { status: 400 }
      );
    }

    // Check if room has expired
    const now = new Date();
    const expiresAt = booking.daily_room_expires_at ? new Date(booking.daily_room_expires_at) : null;
    
    if (expiresAt && now.getTime() > expiresAt.getTime()) {
      return NextResponse.json(
        { error: "Video room has expired" },
        { status: 400 }
      );
    }

    // Generate new tokens if needed (tokens might expire)
    let teacherToken = booking.teacher_daily_token;
    let studentToken = booking.student_daily_token;

    // Calculate room expiration - default to 2 hours from now if no expiration set
    const roomExpiration = expiresAt 
      ? Math.floor(expiresAt.getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours from now

    // Get user profiles for names
    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", booking.private_lessons.communities.created_by)
      .single();

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", booking.student_id)
      .single();

    // Regenerate teacher token if needed
    if (!teacherToken || isTeacher) {
      console.log("Creating teacher token for room:", booking.daily_room_name);
      try {
        const teacherTokenData = await createMeetingToken({
          room_name: booking.daily_room_name,
          user_name: teacherProfile?.display_name || teacherProfile?.full_name || 'Teacher',
          user_id: booking.private_lessons.communities.created_by,
          is_owner: true,
          exp: roomExpiration,
          enable_screenshare: true,
        });
        teacherToken = teacherTokenData.token;
        console.log("Teacher token created successfully");
      } catch (tokenError) {
        console.error("Failed to create teacher token:", tokenError);
        throw new Error(`Failed to create teacher token: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`);
      }
    }

    // Regenerate student token if needed
    if (!studentToken || isStudent) {
      console.log("Creating student token for room:", booking.daily_room_name);
      try {
        const studentTokenData = await createMeetingToken({
          room_name: booking.daily_room_name,
          user_name: studentProfile?.display_name || studentProfile?.full_name || booking.student_name || 'Student',
          user_id: booking.student_id,
          is_owner: false,
          exp: roomExpiration,
          enable_screenshare: true,
        });
        studentToken = studentTokenData.token;
        console.log("Student token created successfully");
      } catch (tokenError) {
        console.error("Failed to create student token:", tokenError);
        throw new Error(`Failed to create student token: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`);
      }
    }

    // Update tokens in database
    const { error: updateError } = await supabase
      .from("lesson_bookings")
      .update({
        teacher_daily_token: teacherToken,
        student_daily_token: studentToken,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating tokens:", updateError);
      // Don't fail the request if token update fails
    }

    return NextResponse.json({
      room_name: booking.daily_room_name,
      room_url: booking.daily_room_url || `https://${booking.daily_room_name}.daily.co/`,
      token: isTeacher ? teacherToken : studentToken,
      expires_at: booking.daily_room_expires_at,
      lesson_title: booking.private_lessons.title,
      duration_minutes: booking.private_lessons.duration_minutes,
      is_teacher: isTeacher,
    });
  } catch (error) {
    console.error("Error in POST /api/bookings/[bookingId]/video-token:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bookingId: params.bookingId,
    });
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
