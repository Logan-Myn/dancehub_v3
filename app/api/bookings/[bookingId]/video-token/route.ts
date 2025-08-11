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

    const roomExpiration = Math.floor(expiresAt!.getTime() / 1000);

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
      const teacherTokenData = await createMeetingToken({
        room_name: booking.daily_room_name,
        user_name: teacherProfile?.display_name || teacherProfile?.full_name || 'Teacher',
        user_id: booking.private_lessons.communities.created_by,
        is_owner: true,
        exp: roomExpiration,
        enable_screenshare: true,
        enable_recording: true,
        start_cloud_recording: false,
      });
      teacherToken = teacherTokenData.token;
    }

    // Regenerate student token if needed
    if (!studentToken || isStudent) {
      const studentTokenData = await createMeetingToken({
        room_name: booking.daily_room_name,
        user_name: studentProfile?.display_name || studentProfile?.full_name || booking.student_name || 'Student',
        user_id: booking.student_id,
        is_owner: false,
        exp: roomExpiration,
        enable_screenshare: true,
        enable_recording: false,
        start_cloud_recording: false,
      });
      studentToken = studentTokenData.token;
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
