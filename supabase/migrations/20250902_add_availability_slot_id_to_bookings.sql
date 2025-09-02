-- Add availability_slot_id to lesson_bookings table to track booked time slots
-- This prevents double-booking by linking bookings to specific availability slots

ALTER TABLE lesson_bookings 
ADD COLUMN availability_slot_id UUID REFERENCES teacher_availability_slots(id) ON DELETE SET NULL;

-- Create index for performance when querying booked slots
CREATE INDEX IF NOT EXISTS idx_lesson_bookings_availability_slot 
ON lesson_bookings(availability_slot_id) 
WHERE availability_slot_id IS NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN lesson_bookings.availability_slot_id IS 'References the availability slot that was booked to prevent double-booking';