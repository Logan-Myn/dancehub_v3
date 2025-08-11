import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const { action, field } = await request.json();

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

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .select(`
        id,
        student_id,
        session_started_at,
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

    const isStudent = booking.student_id === user.id;
    const isTeacher = (booking.private_lessons as any).communities.created_by === user.id;

    if (!isStudent && !isTeacher) {
      return NextResponse.json(
        { error: "Not authorized to access this booking" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const updateData: any = {};

    if (action === 'join') {
      updateData[field] = now;
      
      // If this is the first participant joining, mark session as started
      if (!(booking as any).session_started_at) {
        updateData.session_started_at = now;
      }
    } else if (action === 'leave') {
      // For leave events, we could track duration or just note the leave time
      // For now, we'll just clear the joined_at timestamp
      updateData[field] = null;
    } else if (action === 'session_start') {
      updateData.session_started_at = now;
    } else if (action === 'session_end') {
      updateData.session_ended_at = now;
    }

    const { error: updateError } = await supabase
      .from("lesson_bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating session tracking:", updateError);
      return NextResponse.json(
        { error: "Failed to update session tracking" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/bookings/[bookingId]/track-session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
