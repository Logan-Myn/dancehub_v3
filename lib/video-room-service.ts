import { createAdminClient } from "@/lib/supabase";

/**
 * Consolidated Video Room Service
 * 
 * Handles the entire lifecycle of Daily.co video rooms for private lessons:
 * - Room creation and management
 * - Token generation for secure access
 * - Session tracking and cleanup
 * - Error handling and retry logic
 */

// Daily.co API configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';
const supabase = createAdminClient();

if (!DAILY_API_KEY) {
  console.warn('DAILY_API_KEY is not set in environment variables');
}

// Types for Daily.co API
export interface DailyRoomConfig {
  name?: string;
  privacy?: 'private' | 'public';
  properties?: {
    max_participants?: number;
    exp?: number;
    eject_at_room_exp?: boolean;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: string;
    start_cloud_recording?: boolean;
    owner_only_broadcast?: boolean;
    enable_knocking?: boolean;
    lang?: string;
  };
}

export interface DailyMeetingToken {
  room_name: string;
  user_name?: string;
  user_id?: string;
  is_owner?: boolean;
  exp?: number;
  enable_screenshare?: boolean;
}

export interface VideoRoomResult {
  success: boolean;
  roomName?: string;
  roomUrl?: string;
  teacherToken?: string;
  studentToken?: string;
  error?: string;
  expiresAt?: string;
}

export class VideoRoomService {
  /**
   * Create a complete video room setup for a booking
   * This includes room creation, token generation, and database updates
   */
  async createRoomForBooking(bookingId: string): Promise<VideoRoomResult> {
    try {
      console.log(`🎬 Creating video room for booking: ${bookingId}`);

      // Get booking details with related data
      const booking = await this.getBookingDetails(bookingId);
      
      // Validate booking can have video room
      this.validateBookingForVideo(booking);

      // Check if room already exists
      if (booking.daily_room_name) {
        console.log(`⚠️ Video room already exists for booking: ${bookingId}`);
        return {
          success: true,
          roomName: booking.daily_room_name,
          roomUrl: booking.daily_room_url,
          teacherToken: booking.teacher_daily_token,
          studentToken: booking.student_daily_token,
          expiresAt: booking.daily_room_expires_at,
        };
      }

      // Generate room configuration
      const { roomName, roomExpiration } = this.generateRoomConfig(booking);

      // Create Daily.co room
      const dailyRoom = await this.createDailyRoom(roomName, roomExpiration);

      // Generate secure tokens for teacher and student
      const tokens = await this.generateTokensForBooking(booking, roomName, roomExpiration);

      // Update database with room details
      await this.updateBookingWithRoomDetails(bookingId, dailyRoom, tokens, roomExpiration);

      console.log(`✅ Video room created successfully for booking: ${bookingId}`);

      return {
        success: true,
        roomName: dailyRoom.name,
        roomUrl: dailyRoom.url,
        teacherToken: tokens.teacherToken,
        studentToken: tokens.studentToken,
        expiresAt: new Date(roomExpiration * 1000).toISOString(),
      };

    } catch (error) {
      console.error(`❌ Error creating video room for booking ${bookingId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate new access tokens for an existing room
   */
  async generateTokensForRoom(bookingId: string): Promise<{ teacherToken: string; studentToken: string }> {
    const booking = await this.getBookingDetails(bookingId);
    
    if (!booking.daily_room_name) {
      throw new Error('No video room exists for this booking');
    }

    const roomExpiration = booking.daily_room_expires_at 
      ? Math.floor(new Date(booking.daily_room_expires_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (2 * 60 * 60); // 2 hours fallback

    const tokens = await this.generateTokensForBooking(booking, booking.daily_room_name, roomExpiration);

    // Update tokens in database
    await supabase
      .from("lesson_bookings")
      .update({
        teacher_daily_token: tokens.teacherToken,
        student_daily_token: tokens.studentToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    return tokens;
  }

  /**
   * Mark video session as started
   */
  async startSession(bookingId: string, userRole: 'teacher' | 'student'): Promise<void> {
    const now = new Date().toISOString();
    const updateField = userRole === 'teacher' ? 'teacher_joined_at' : 'student_joined_at';
    
    // Check if this is the first person to join (start the session)
    const { data: booking } = await supabase
      .from("lesson_bookings")
      .select("session_started_at, teacher_joined_at, student_joined_at")
      .eq("id", bookingId)
      .single();

    const updates: any = {
      [updateField]: now,
      updated_at: now,
    };

    // If no one has joined yet, mark session as started
    if (booking && !booking.session_started_at) {
      updates.session_started_at = now;
    }

    await supabase
      .from("lesson_bookings")
      .update(updates)
      .eq("id", bookingId);

    console.log(`📹 ${userRole} joined video session for booking: ${bookingId}`);
  }

  /**
   * Mark video session as ended
   */
  async endSession(bookingId: string): Promise<void> {
    const now = new Date().toISOString();
    
    await supabase
      .from("lesson_bookings")
      .update({
        session_ended_at: now,
        updated_at: now,
      })
      .eq("id", bookingId);

    console.log(`⏹️ Video session ended for booking: ${bookingId}`);
  }

  /**
   * Clean up expired rooms
   */
  async cleanupExpiredRooms(): Promise<void> {
    const { data: expiredBookings } = await supabase
      .from("lesson_bookings")
      .select("id, daily_room_name")
      .lt("daily_room_expires_at", new Date().toISOString())
      .not("daily_room_name", "is", null);

    if (expiredBookings?.length) {
      console.log(`🧹 Cleaning up ${expiredBookings.length} expired video rooms`);
      
      for (const booking of expiredBookings) {
        try {
          if (booking.daily_room_name) {
            await this.deleteDailyRoom(booking.daily_room_name);
          }
          
          await supabase
            .from("lesson_bookings")
            .update({
              daily_room_name: null,
              daily_room_url: null,
              teacher_daily_token: null,
              student_daily_token: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);
            
        } catch (error) {
          console.error(`Error cleaning up room for booking ${booking.id}:`, error);
        }
      }
    }
  }

  // Private helper methods

  private async getBookingDetails(bookingId: string) {
    const { data: booking, error } = await supabase
      .from("lesson_bookings")
      .select(`
        id,
        private_lesson_id,
        student_id,
        student_name,
        community_id,
        payment_status,
        scheduled_at,
        daily_room_name,
        daily_room_url,
        daily_room_expires_at,
        teacher_daily_token,
        student_daily_token,
        private_lessons!inner(
          title,
          duration_minutes,
          location_type,
          teacher_id,
          communities!inner(
            slug,
            created_by
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    return booking;
  }

  private validateBookingForVideo(booking: any): void {
    if (booking.payment_status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    const lesson = booking.private_lessons;
    if (lesson.location_type !== 'online' && lesson.location_type !== 'both') {
      throw new Error('Video room not needed for in-person only lessons');
    }
  }

  private generateRoomConfig(booking: any): { roomName: string; roomExpiration: number } {
    const lesson = booking.private_lessons;
    const community = lesson.communities;
    
    // Generate unique room name - ensure it meets Daily.co requirements
    // Room names must be alphanumeric with dashes/underscores, max 128 chars
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const shortBookingId = booking.id.substring(0, 8);
    const sanitizedSlug = community.slug.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 20);
    const roomName = `${sanitizedSlug}-${shortBookingId}-${randomSuffix}`.toLowerCase();

    console.log('🏠 Generated room name:', roomName);

    // Calculate expiration time
    const bufferMinutes = 30;
    const totalMinutes = lesson.duration_minutes + bufferMinutes;
    
    let roomExpiration: number;
    if (booking.scheduled_at) {
      const scheduledTime = new Date(booking.scheduled_at).getTime() / 1000;
      roomExpiration = scheduledTime + (totalMinutes * 60);
    } else {
      roomExpiration = Math.floor(Date.now() / 1000) + (totalMinutes * 60);
    }

    // Ensure expiration is in the future
    const now = Math.floor(Date.now() / 1000);
    if (roomExpiration <= now) {
      roomExpiration = now + (2 * 60 * 60); // 2 hours from now as fallback
    }

    console.log('⏰ Room expires at:', new Date(roomExpiration * 1000).toISOString());

    return { roomName, roomExpiration };
  }

  private async createDailyRoom(roomName: string, expiration: number) {
    if (!DAILY_API_KEY) {
      throw new Error('Daily.co API key is not configured');
    }

    // Validate API key format (should start with a specific pattern)
    if (!DAILY_API_KEY.match(/^[a-f0-9-]{36,}$/i) && !DAILY_API_KEY.startsWith('sk_')) {
      console.warn('⚠️ Daily.co API key format might be invalid');
    }

    const roomConfig: DailyRoomConfig = {
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: 2,
        exp: expiration,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'cloud',
        start_cloud_recording: false,
        owner_only_broadcast: false,
        enable_knocking: false, // Disable knocking for smoother experience
        lang: 'en',
      },
    };

    console.log('🎬 Creating Daily.co room with config:', {
      name: roomConfig.name,
      privacy: roomConfig.privacy,
      max_participants: roomConfig.properties?.max_participants,
      expires_at: new Date(expiration * 1000).toISOString(),
    });

    const response = await this.makeApiRequest(`${DAILY_API_URL}/rooms`, 'POST', roomConfig);
    return response;
  }

  private async generateTokensForBooking(booking: any, roomName: string, expiration: number) {
    const lesson = booking.private_lessons;
    
    // Generate teacher token (owner privileges)
    const teacherTokenConfig: DailyMeetingToken = {
      room_name: roomName,
      user_name: 'Teacher',
      user_id: lesson.teacher_id,
      is_owner: true,
      exp: expiration,
      enable_screenshare: true,
    };

    // Generate student token (participant privileges)
    const studentTokenConfig: DailyMeetingToken = {
      room_name: roomName,
      user_name: booking.student_name || 'Student',
      user_id: booking.student_id,
      is_owner: false,
      exp: expiration,
      enable_screenshare: false,
    };

    const [teacherResponse, studentResponse] = await Promise.all([
      this.createMeetingToken(teacherTokenConfig),
      this.createMeetingToken(studentTokenConfig)
    ]);

    return {
      teacherToken: teacherResponse.token,
      studentToken: studentResponse.token,
    };
  }

  private async createMeetingToken(tokenConfig: DailyMeetingToken) {
    const requestBody = { properties: tokenConfig };
    return this.makeApiRequest(`${DAILY_API_URL}/meeting-tokens`, 'POST', requestBody);
  }

  private async deleteDailyRoom(roomName: string) {
    return this.makeApiRequest(`${DAILY_API_URL}/rooms/${roomName}`, 'DELETE');
  }

  private async updateBookingWithRoomDetails(
    bookingId: string,
    dailyRoom: any,
    tokens: { teacherToken: string; studentToken: string },
    expiration: number
  ) {
    const { error } = await supabase
      .from("lesson_bookings")
      .update({
        daily_room_name: dailyRoom.name,
        daily_room_url: dailyRoom.url,
        daily_room_created_at: new Date().toISOString(),
        daily_room_expires_at: new Date(expiration * 1000).toISOString(),
        teacher_daily_token: tokens.teacherToken,
        student_daily_token: tokens.studentToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      throw new Error(`Failed to update booking with room details: ${error.message}`);
    }
  }

  private async makeApiRequest(url: string, method: 'GET' | 'POST' | 'DELETE', body?: any, retries = 2) {
    if (!DAILY_API_KEY) {
      throw new Error('Daily.co API key is not configured');
    }

    console.log(`📡 Daily.co API Request: ${method} ${url}`);
    if (body) {
      console.log('📡 Request body:', JSON.stringify(body, null, 2));
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const options: RequestInit = {
          method,
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            ...(body && { 'Content-Type': 'application/json' }),
          },
          ...(body && { body: JSON.stringify(body) }),
        };

        const response = await fetch(url, options);
        
        console.log(`📡 Daily.co API Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetail;
          
          try {
            errorDetail = JSON.parse(errorText);
          } catch {
            errorDetail = { error: errorText };
          }
          
          console.error('📡 Daily.co API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorDetail,
            url,
            method,
            body
          });
          
          throw new Error(`Daily.co API error (${response.status}): ${errorDetail.error || errorDetail.message || errorText || 'Request failed'}`);
        }

        const result = method === 'DELETE' ? {} : await response.json();
        console.log('📡 Daily.co API Success:', result);
        return result;

      } catch (error) {
        if (attempt === retries) {
          console.error(`Daily.co API request failed after ${retries + 1} attempts:`, error);
          throw error;
        }
        console.warn(`Daily.co API attempt ${attempt + 1} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
      }
    }
  }
}

// Export singleton instance
export const videoRoomService = new VideoRoomService();