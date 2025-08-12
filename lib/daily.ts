// Daily.co API configuration
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

if (!DAILY_API_KEY) {
  console.warn('DAILY_API_KEY is not set in environment variables');
}

export interface DailyRoomConfig {
  name?: string;
  privacy?: 'private' | 'public';
  properties?: {
    max_participants?: number;
    exp?: number; // Unix timestamp for expiration
    eject_at_room_exp?: boolean;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: string; // 'cloud' | 'local' | 'raw-tracks'
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
  enable_recording?: boolean;
}

/**
 * Create a Daily.co room for a private lesson
 */
export async function createDailyRoom(config: DailyRoomConfig) {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key is not configured');
  }

  try {
    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Daily.co API error: ${error.error || 'Failed to create room'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    throw error;
  }
}

/**
 * Delete a Daily.co room
 */
export async function deleteDailyRoom(roomName: string) {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key is not configured');
  }

  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Daily.co API error: ${error.error || 'Failed to delete room'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting Daily.co room:', error);
    throw error;
  }
}

/**
 * Create a meeting token for secure room access
 */
export async function createMeetingToken(tokenConfig: DailyMeetingToken) {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key is not configured');
  }

  try {
    const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: tokenConfig,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Daily.co API error: ${error.error || 'Failed to create meeting token'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Daily.co meeting token:', error);
    throw error;
  }
}

/**
 * Get room information
 */
export async function getDailyRoom(roomName: string) {
  if (!DAILY_API_KEY) {
    throw new Error('Daily.co API key is not configured');
  }

  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Daily.co API error: ${error.error || 'Failed to get room'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Daily.co room:', error);
    throw error;
  }
}

/**
 * Generate a unique room name for a private lesson
 */
export function generateRoomName(bookingId: string, communitySlug: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const shortBookingId = bookingId.substring(0, 8);
  return `${communitySlug}-${shortBookingId}-${randomSuffix}`;
}

/**
 * Calculate room expiration time (lesson duration + 30 minutes buffer)
 */
export function calculateRoomExpiration(lessonDurationMinutes: number): number {
  const bufferMinutes = 30;
  const totalMinutes = lessonDurationMinutes + bufferMinutes;
  return Math.floor(Date.now() / 1000) + (totalMinutes * 60);
}
