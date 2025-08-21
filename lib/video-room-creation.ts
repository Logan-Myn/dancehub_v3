import { createAdminClient } from "@/lib/supabase";
import { 
  createDailyRoom, 
  generateRoomName, 
  calculateRoomExpiration 
} from "@/lib/daily";

const supabase = createAdminClient();

export async function createVideoRoomForBooking(bookingId: string) {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("lesson_bookings")
      .select(`
        id,
        private_lesson_id,
        student_id,
        community_id,
        payment_status,
        scheduled_at,
        daily_room_name,
        daily_room_url,
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
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Only create video room for paid online lessons
    if (booking.payment_status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    const lesson = booking.private_lessons as any;
    if (lesson.location_type !== 'online' && lesson.location_type !== 'both') {
      return null; // No video room needed for in-person only lessons
    }

    // Check if video room already exists
    if (booking.daily_room_name) {
      console.log('Video room already exists for booking:', bookingId);
      return booking;
    }

    // Generate room details
    const roomName = generateRoomName(booking.id, lesson.communities.slug);
    const roomExpiration = calculateRoomExpiration(
      lesson.duration_minutes, 
      booking.scheduled_at // Pass the scheduled time for proper expiration
    );

    // Create the Daily.co room with basic configuration
    const roomConfig = {
      name: roomName,
      privacy: 'private' as const,
      properties: {
        max_participants: 2,
        exp: roomExpiration,
      },
    };

    const dailyRoomData = await createDailyRoom(roomConfig);

    // For now, skip token creation to isolate the issue
    const teacherToken = null;
    const studentToken = null;

    // Update booking with video room details
    const { data: updatedBooking, error: updateError } = await supabase
      .from("lesson_bookings")
      .update({
        daily_room_name: dailyRoomData.name,
        daily_room_url: dailyRoomData.url,
        daily_room_created_at: new Date().toISOString(),
        daily_room_expires_at: roomExpiration ? new Date(roomExpiration * 1000).toISOString() : null,
        teacher_daily_token: teacherToken,
        student_daily_token: studentToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking with video room:', updateError);
      throw updateError;
    }

    console.log('✅ Video room created successfully for booking:', bookingId);
    return updatedBooking;
  } catch (error) {
    console.error('❌ Error creating video room for booking:', bookingId, error);
    throw error;
  }
}
