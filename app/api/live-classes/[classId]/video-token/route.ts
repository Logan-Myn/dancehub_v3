import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoRoomService } from "@/lib/video-room-service";
import { getDailyDomain } from "@/lib/get-daily-domain";

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const adminSupabase = createAdminClient();

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get live class details
    const { data: liveClass, error: classError } = await adminSupabase
      .from("live_classes_with_details")
      .select("*")
      .eq("id", params.classId)
      .single();

    if (classError || !liveClass) {
      return NextResponse.json(
        { error: "Live class not found" },
        { status: 404 }
      );
    }

    // Get user profile for display name
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.display_name || profile?.full_name || user.email?.split('@')[0] || 'Guest';

    // Check if user is authorized to join (community member, teacher, or creator)
    const isTeacher = liveClass.teacher_id === user.id;
    const isCreator = liveClass.community_created_by === user.id;

    if (!isTeacher && !isCreator) {
      // Check if user is a community member
      const { data: membership } = await adminSupabase
        .from("community_members")
        .select("status")
        .eq("community_id", liveClass.community_id)
        .eq("user_id", user.id)
        .single();

      if (!membership || membership.status !== 'active') {
        return NextResponse.json(
          { error: "Access denied. Community membership required." },
          { status: 403 }
        );
      }
    }

    // Check if class is available to join (starting soon or currently active)
    const now = new Date();
    const classStartTime = new Date(liveClass.scheduled_start_time);
    const classEndTime = new Date(classStartTime.getTime() + liveClass.duration_minutes * 60000);
    const joinWindowStart = new Date(classStartTime.getTime() - 15 * 60000); // 15 minutes before

    if (now < joinWindowStart) {
      return NextResponse.json(
        { error: "Class is not yet available to join" },
        { status: 403 }
      );
    }

    if (now > classEndTime) {
      return NextResponse.json(
        { error: "Class has ended" },
        { status: 403 }
      );
    }

    // Create or get existing Daily.co room
    if (!liveClass.daily_room_name || !liveClass.daily_room_url) {
      // Create room using video room service
      await videoRoomService.createRoomForLiveClass(params.classId);
      
      // Refetch the live class with updated room details
      const { data: updatedClass, error: refetchError } = await adminSupabase
        .from("live_classes")
        .select("daily_room_name, daily_room_url")
        .eq("id", params.classId)
        .single();

      if (refetchError || !updatedClass?.daily_room_name) {
        return NextResponse.json(
          { error: "Failed to create video room" },
          { status: 500 }
        );
      }

      liveClass.daily_room_name = updatedClass.daily_room_name;
      liveClass.daily_room_url = updatedClass.daily_room_url;
    }

    // Generate tokens for the user
    const tokens = await videoRoomService.generateTokensForLiveClass(
      params.classId,
      user.id,
      isTeacher,
      userName
    );

    if (!tokens) {
      return NextResponse.json(
        { error: "Failed to generate video tokens" },
        { status: 500 }
      );
    }

    // Get Daily domain
    const domain = await getDailyDomain();
    
    // Construct the room URL
    const roomUrl = `https://${domain}.daily.co/${liveClass.daily_room_name}`;

    return NextResponse.json({
      roomUrl,
      token: tokens.token,
      expires: tokens.expires,
    });
  } catch (error) {
    console.error("Error generating live class video token:", error);
    return NextResponse.json(
      { error: "Failed to generate video token" },
      { status: 500 }
    );
  }
}