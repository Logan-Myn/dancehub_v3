import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoRoomService } from "@/lib/video-room-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    const supabase = createAdminClient();

    // Get community by slug
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Build query for live classes
    let query = supabase
      .from("live_classes_with_details")
      .select("*")
      .eq("community_id", community.id)
      .order("scheduled_start_time", { ascending: true });

    // Filter by date range if provided
    if (start && end) {
      query = query
        .gte("scheduled_start_time", `${start}T00:00:00`)
        .lte("scheduled_start_time", `${end}T23:59:59`);
    }

    const { data: liveClasses, error } = await query;

    if (error) {
      console.error("Error fetching live classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch live classes" },
        { status: 500 }
      );
    }

    return NextResponse.json(liveClasses || []);
  } catch (error) {
    console.error("Error in live classes GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { communitySlug: string } }
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

    // Get community by slug
    const { data: community, error: communityError } = await adminSupabase
      .from("communities")
      .select("id, created_by")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized (community creator or will add teacher role check later)
    if (community.created_by !== user.id) {
      // TODO: Add check for teacher role in the community
      return NextResponse.json(
        { error: "Not authorized to create live classes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, scheduled_start_time, duration_minutes } = body;

    // Validate required fields
    if (!title || !scheduled_start_time || !duration_minutes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the live class
    const { data: liveClass, error: insertError } = await adminSupabase
      .from("live_classes")
      .insert({
        community_id: community.id,
        teacher_id: user.id,
        title,
        description,
        scheduled_start_time,
        duration_minutes: parseInt(duration_minutes),
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error creating live class:", insertError);
      return NextResponse.json(
        { error: "Failed to create live class" },
        { status: 500 }
      );
    }

    // Create Daily.co video room for the live class
    const videoRoomResult = await videoRoomService.createRoomForLiveClass(liveClass.id);

    if (!videoRoomResult.success) {
      console.error("Warning: Failed to create video room for live class:", videoRoomResult.error);
      // Don't fail the entire request - the class is created, just without a video room
      // The room can be created later or manually
    }

    return NextResponse.json(liveClass, { status: 201 });
  } catch (error) {
    console.error("Error in live classes POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}