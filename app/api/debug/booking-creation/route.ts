import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { createVideoRoomForBooking } from '@/lib/video-room-creation';

const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('🔧 Debug booking creation endpoint hit with body:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    const requiredFields = ['lesson_id', 'community_id', 'student_id', 'student_email', 'price_paid'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            error: `Missing required field: ${field}`,
            receivedFields: Object.keys(body)
          }, 
          { status: 400 }
        );
      }
    }

    // Check if lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('private_lessons')
      .select('id, title, community_id')
      .eq('id', body.lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { 
          error: 'Private lesson not found',
          lesson_id: body.lesson_id,
          lessonError 
        }, 
        { status: 404 }
      );
    }

    console.log('✅ Found lesson:', lesson);

    // Check if community exists
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, name, slug')
      .eq('id', body.community_id)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { 
          error: 'Community not found',
          community_id: body.community_id,
          communityError 
        }, 
        { status: 404 }
      );
    }

    console.log('✅ Found community:', community);

    // Parse contact_info JSON if provided
    let contactInfo = {};
    if (body.contact_info) {
      try {
        contactInfo = typeof body.contact_info === 'string' 
          ? JSON.parse(body.contact_info) 
          : body.contact_info;
      } catch (e) {
        console.warn('Failed to parse contact_info, using empty object');
      }
    }

    // Create the booking record
    const bookingData = {
      private_lesson_id: body.lesson_id,
      community_id: body.community_id,
      student_id: body.student_id,
      student_email: body.student_email,
      student_name: body.student_name || '',
      is_community_member: body.is_member === 'true' || body.is_member === true,
      price_paid: parseFloat(body.price_paid),
      stripe_payment_intent_id: body.payment_intent_id || `debug_${Date.now()}`,
      payment_status: 'succeeded',
      lesson_status: 'scheduled',
      scheduled_at: body.scheduled_at || null,
      student_message: body.student_message || '',
      contact_info: contactInfo,
      // Video room fields
      daily_room_name: null,
      daily_room_url: null,
      daily_room_expires_at: null,
      teacher_daily_token: null,
      student_daily_token: null,
      video_call_started_at: null,
      video_call_ended_at: null
    };

    console.log('📝 Creating booking with data:', JSON.stringify(bookingData, null, 2));

    const { data: newBooking, error: bookingCreateError } = await supabase
      .from('lesson_bookings')
      .insert(bookingData)
      .select('*')
      .single();

    if (bookingCreateError) {
      console.error('❌ Error creating booking record:', bookingCreateError);
      return NextResponse.json(
        { 
          error: 'Failed to create booking', 
          details: bookingCreateError,
          attemptedData: bookingData
        }, 
        { status: 500 }
      );
    }

    console.log('✅ Successfully created booking:', newBooking);

    // Create video room
    let videoRoomResult = null;
    try {
      console.log('🎬 Creating video room for booking:', newBooking.id);
      await createVideoRoomForBooking(newBooking.id);
      console.log('✅ Video room created successfully');
      
      // Fetch updated booking with video room data
      const { data: updatedBooking } = await supabase
        .from('lesson_bookings')
        .select('*')
        .eq('id', newBooking.id)
        .single();
      
      videoRoomResult = {
        success: true,
        room_name: updatedBooking?.daily_room_name,
        room_url: updatedBooking?.daily_room_url
      };
    } catch (videoError) {
      console.error('❌ Error creating video room:', videoError);
      videoRoomResult = {
        success: false,
        error: videoError.message
      };
    }

    return NextResponse.json({
      success: true,
      booking: newBooking,
      lesson: lesson,
      community: community,
      videoRoom: videoRoomResult
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}