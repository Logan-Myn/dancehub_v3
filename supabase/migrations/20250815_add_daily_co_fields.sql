-- Migration: Add Daily.co video integration fields to lesson_bookings table
-- This migration adds the necessary columns to support Daily.co video rooms for private lessons

-- Add Daily.co video room fields to lesson_bookings table
ALTER TABLE lesson_bookings 
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS daily_room_url TEXT,
ADD COLUMN IF NOT EXISTS daily_room_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teacher_daily_token TEXT,
ADD COLUMN IF NOT EXISTS student_daily_token TEXT,
ADD COLUMN IF NOT EXISTS video_call_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS video_call_ended_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_bookings_daily_room_name 
ON lesson_bookings(daily_room_name);

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_video_call_started 
ON lesson_bookings(video_call_started_at);

CREATE INDEX IF NOT EXISTS idx_lesson_bookings_room_expires 
ON lesson_bookings(daily_room_expires_at);

-- Add comments to document the fields
COMMENT ON COLUMN lesson_bookings.daily_room_name IS 'Daily.co room name for video calls';
COMMENT ON COLUMN lesson_bookings.daily_room_url IS 'Full URL to the Daily.co room';
COMMENT ON COLUMN lesson_bookings.daily_room_expires_at IS 'When the Daily.co room expires';
COMMENT ON COLUMN lesson_bookings.teacher_daily_token IS 'Daily.co meeting token for the teacher';
COMMENT ON COLUMN lesson_bookings.student_daily_token IS 'Daily.co meeting token for the student';
COMMENT ON COLUMN lesson_bookings.video_call_started_at IS 'When the video call was started';
COMMENT ON COLUMN lesson_bookings.video_call_ended_at IS 'When the video call ended';
