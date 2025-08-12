import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { createVideoRoomForBooking } from "@/lib/video-room-creation";

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // Verify the booking exists and user has access to it
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .select(`
        id,
        payment_status,
        daily_room_name,
        student_id,
        private_lessons!inner(
          communities!inner(created_by)
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

    // Check if payment is completed
    if (booking.payment_status !== 'succeeded') {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Check if video room already exists
    if (booking.daily_room_name) {
      return NextResponse.json(
        { message: "Video room already exists", booking },
        { status: 200 }
      );
    }

    // Create the video room
    const updatedBooking = await createVideoRoomForBooking(bookingId);

    return NextResponse.json({
      message: "Video room created successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error creating video room:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error("Error stack:", errorStack);
    console.error("Error message:", errorMessage);
    return NextResponse.json(
      { error: "Failed to create video room", details: errorMessage },
      { status: 500 }
    );
  }
}
