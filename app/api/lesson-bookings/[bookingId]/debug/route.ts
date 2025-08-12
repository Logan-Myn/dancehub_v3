import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { generateRoomName, calculateRoomExpiration } from "@/lib/daily";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .select(`
        id,
        payment_status,
        daily_room_name,
        student_id,
        private_lessons!inner(
          title,
          duration_minutes,
          location_type,
          communities!inner(
            slug,
            created_by
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const lesson = booking.private_lessons as any;
    
    // Generate what would be sent to Daily.co
    const roomName = generateRoomName(booking.id, lesson.communities.slug);
    const roomExpiration = calculateRoomExpiration(lesson.duration_minutes);

    const roomConfig = {
      name: roomName,
      privacy: 'private' as const,
      properties: {
        max_participants: 2,
        exp: roomExpiration,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'cloud' as const,
        start_cloud_recording: false,
        owner_only_broadcast: false,
        enable_knocking: true,
        lang: 'en',
      },
    };

    return NextResponse.json({
      booking,
      roomConfig,
      roomName,
      roomExpiration,
      expirationDate: new Date(roomExpiration * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Debug failed", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
