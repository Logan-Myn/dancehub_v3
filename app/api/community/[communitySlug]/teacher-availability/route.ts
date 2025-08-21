import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { TeacherAvailabilitySlot } from '@/types/private-lessons';

const supabase = createAdminClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
) {
  try {
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

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    // Get teacher availability slots 
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // Optional: filter from this date
    const endDate = searchParams.get('endDate'); // Optional: filter to this date
    const teacherId = searchParams.get('teacher_id'); // Optional: get specific teacher's availability

    // If teacher_id is provided, get that teacher's availability (for students booking)
    // Otherwise, get the current user's availability (for teachers managing their own)
    const targetTeacherId = teacherId || user.id;

    // Build query
    let query = supabase
      .from('teacher_availability_slots')
      .select('*')
      .eq('teacher_id', targetTeacherId)
      .eq('community_id', community.id)
      .eq('is_active', true)
      .order('availability_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Add date filters if provided
    if (startDate) {
      query = query.gte('availability_date', startDate);
    }
    if (endDate) {
      query = query.lte('availability_date', endDate);
    }

    const { data: slots, error: slotsError } = await query;

    if (slotsError) {
      console.error('Error fetching availability slots:', slotsError);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    return NextResponse.json(slots || []);

  } catch (error) {
    console.error('Error in teacher availability GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
) {
  try {
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

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date, start_time, end_time } = body;

    // Validate input
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // Check if date is in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return NextResponse.json({ error: 'Cannot set availability for past dates' }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Start time and end time are required' }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM format' }, { status: 400 });
    }

    // Check if end time is after start time
    if (start_time >= end_time) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Check for overlapping slots on the same date
    const { data: existingSlots, error: checkError } = await supabase
      .from('teacher_availability_slots')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('community_id', community.id)
      .eq('availability_date', date)
      .eq('is_active', true);

    if (checkError) {
      console.error('Error checking existing slots:', checkError);
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    // Check for overlaps
    const hasOverlap = existingSlots?.some((slot: TeacherAvailabilitySlot) => {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;
      return (
        (start_time >= slotStart && start_time < slotEnd) ||
        (end_time > slotStart && end_time <= slotEnd) ||
        (start_time <= slotStart && end_time >= slotEnd)
      );
    });

    if (hasOverlap) {
      return NextResponse.json({ error: 'Time slot overlaps with existing availability' }, { status: 400 });
    }

    // Create new availability slot
    const { data: newSlot, error: insertError } = await supabase
      .from('teacher_availability_slots')
      .insert({
        teacher_id: user.id,
        community_id: community.id,
        availability_date: date,
        start_time,
        end_time,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating availability slot:', insertError);
      return NextResponse.json({ error: 'Failed to create availability slot' }, { status: 500 });
    }

    return NextResponse.json(newSlot, { status: 201 });

  } catch (error) {
    console.error('Error in teacher availability POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
) {
  try {
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

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    // Delete the availability slot (soft delete by setting is_active to false)
    const { error: deleteError } = await supabase
      .from('teacher_availability_slots')
      .update({ is_active: false })
      .eq('id', slotId)
      .eq('teacher_id', user.id); // Ensure teacher can only delete their own slots

    if (deleteError) {
      console.error('Error deleting availability slot:', deleteError);
      return NextResponse.json({ error: 'Failed to delete availability slot' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in teacher availability DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
