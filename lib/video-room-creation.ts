import { sql, queryOne } from "@/lib/db";
import {
  createDailyRoom,
  generateRoomName,
  calculateRoomExpiration
} from "@/lib/daily";

/**
 * Video Room Creation Helper
 *
 * Creates Daily.co video rooms for lesson bookings
 *
 * Migrated from Supabase to Neon database
 */

interface BookingWithLesson {
  id: string;
  private_lesson_id: string;
  student_id: string;
  community_id: string;
  payment_status: string;
  scheduled_at: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  lesson_title: string;
  lesson_duration_minutes: number;
  lesson_location_type: string;
  community_slug: string;
  community_created_by: string;
}

interface UpdatedBooking {
  id: string;
  daily_room_name: string | null;
  daily_room_url: string | null;
  daily_room_created_at: string | null;
  daily_room_expires_at: string | null;
  teacher_daily_token: string | null;
  student_daily_token: string | null;
}

export async function createVideoRoomForBooking(bookingId: string) {
  try {
    // Get booking details
    const booking = await queryOne<BookingWithLesson>`
      SELECT
        lb.id,
        lb.private_lesson_id,
        lb.student_id,
        lb.community_id,
        lb.payment_status,
        lb.scheduled_at,
        lb.daily_room_name,
        lb.daily_room_url,
        pl.title as lesson_title,
        pl.duration_minutes as lesson_duration_minutes,
        pl.location_type as lesson_location_type,
        c.slug as community_slug,
        c.created_by as community_created_by
      FROM lesson_bookings lb
      INNER JOIN private_lessons pl ON pl.id = lb.private_lesson_id
      INNER JOIN communities c ON c.id = pl.community_id
      WHERE lb.id = ${bookingId}
    `;

    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Only create video room for paid online lessons
    if (booking.payment_status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    if (booking.lesson_location_type !== 'online' && booking.lesson_location_type !== 'both') {
      return null; // No video room needed for in-person only lessons
    }

    // Check if video room already exists
    if (booking.daily_room_name) {
      console.log('Video room already exists for booking:', bookingId);
      return booking;
    }

    // Generate room details
    const roomName = generateRoomName(booking.id, booking.community_slug);
    const roomExpiration = calculateRoomExpiration(
      booking.lesson_duration_minutes,
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

    const now = new Date().toISOString();
    const expiresAt = roomExpiration ? new Date(roomExpiration * 1000).toISOString() : null;

    // Update booking with video room details
    await sql`
      UPDATE lesson_bookings
      SET
        daily_room_name = ${dailyRoomData.name},
        daily_room_url = ${dailyRoomData.url},
        daily_room_created_at = ${now},
        daily_room_expires_at = ${expiresAt},
        teacher_daily_token = ${teacherToken},
        student_daily_token = ${studentToken},
        updated_at = ${now}
      WHERE id = ${bookingId}
    `;

    // Get the updated booking
    const updatedBooking = await queryOne<UpdatedBooking>`
      SELECT
        id,
        daily_room_name,
        daily_room_url,
        daily_room_created_at,
        daily_room_expires_at,
        teacher_daily_token,
        student_daily_token
      FROM lesson_bookings
      WHERE id = ${bookingId}
    `;

    console.log('Video room created successfully for booking:', bookingId);
    return updatedBooking;
  } catch (error) {
    console.error('Error creating video room for booking:', bookingId, error);
    throw error;
  }
}
