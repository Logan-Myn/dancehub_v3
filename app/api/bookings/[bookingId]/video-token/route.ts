import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { videoRoomService } from "@/lib/video-room-service";
import { getDailyDomain } from "@/lib/get-daily-domain";

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

    // Generate fresh tokens using the VideoRoomService
    console.log("Generating fresh tokens for booking:", bookingId);
    try {
      const tokens = await videoRoomService.generateTokensForRoom(bookingId);
      const teacherToken = tokens.teacherToken;
      const studentToken = tokens.studentToken;
      
      // Track session start when user requests tokens
      const userRole = isTeacher ? 'teacher' : 'student';
      await videoRoomService.startSession(bookingId, userRole);
      
      console.log("Tokens generated and session started successfully");

      // Debug logging
      console.log("Room details:", {
        roomName: booking.daily_room_name,
        roomUrl: booking.daily_room_url,
        hasStoredUrl: !!booking.daily_room_url
      });

      // If no URL is stored, we need to construct it properly
      let roomUrl = booking.daily_room_url;
      
      if (!roomUrl && booking.daily_room_name) {
        // Get the actual Daily domain from the API
        const dailyDomain = await getDailyDomain();
        roomUrl = `https://${dailyDomain}.daily.co/${booking.daily_room_name}`;
        console.log(`Constructed room URL using domain '${dailyDomain}':`, roomUrl);
      }

      console.log("Final room URL:", roomUrl);

      return NextResponse.json({
        room_name: booking.daily_room_name,
        room_url: roomUrl,
        token: isTeacher ? teacherToken : studentToken,
        expires_at: booking.daily_room_expires_at,
        lesson_title: booking.private_lessons.title,
        duration_minutes: booking.private_lessons.duration_minutes,
        is_teacher: isTeacher,
      });
    } catch (tokenError) {
      console.error("Failed to generate tokens:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate video tokens" },
        { status: 500 }
      );
    }
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
