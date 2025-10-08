import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/client";
import { cookies } from "next/headers";
import { videoRoomService } from "@/lib/video-room-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { communitySlug: string; classId: string } }
) {
  try {
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

    // Get live class with details
    const { data: liveClass, error } = await supabase
      .from("live_classes_with_details")
      .select("*")
      .eq("id", params.classId)
      .eq("community_id", community.id)
      .single();

    if (error || !liveClass) {
      return NextResponse.json(
        { error: "Live class not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(liveClass);
  } catch (error) {
    console.error("Error in live class GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { communitySlug: string; classId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Get the live class to check ownership
    const { data: liveClass, error: classError } = await adminSupabase
      .from("live_classes")
      .select("teacher_id, daily_room_name")
      .eq("id", params.classId)
      .eq("community_id", community.id)
      .single();

    if (classError || !liveClass) {
      return NextResponse.json(
        { error: "Live class not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized (teacher or community creator)
    if (liveClass.teacher_id !== user.id && community.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this live class" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, scheduled_start_time, duration_minutes, status } = body;

    // Update the live class
    const { data: updatedClass, error: updateError } = await adminSupabase
      .from("live_classes")
      .update({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(scheduled_start_time && { scheduled_start_time }),
        ...(duration_minutes && { duration_minutes: parseInt(duration_minutes) }),
        ...(status && { status }),
      })
      .eq("id", params.classId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating live class:", updateError);
      return NextResponse.json(
        { error: "Failed to update live class" },
        { status: 500 }
      );
    }

    // If the class doesn't have a Daily.co room, create one
    if (!liveClass.daily_room_name) {
      const videoRoomResult = await videoRoomService.createRoomForLiveClass(params.classId);
      if (!videoRoomResult.success) {
        console.error("Warning: Failed to create video room for live class:", videoRoomResult.error);
      }
    }

    return NextResponse.json(updatedClass);
  } catch (error) {
    console.error("Error in live class PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { communitySlug: string; classId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Get the live class to check ownership
    const { data: liveClass, error: classError } = await adminSupabase
      .from("live_classes")
      .select("teacher_id")
      .eq("id", params.classId)
      .eq("community_id", community.id)
      .single();

    if (classError || !liveClass) {
      return NextResponse.json(
        { error: "Live class not found" },
        { status: 404 }
      );
    }

    // Check if user is authorized (teacher or community creator)
    if (liveClass.teacher_id !== user.id && community.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this live class" },
        { status: 403 }
      );
    }

    // Soft delete by setting status to cancelled
    const { error: deleteError } = await adminSupabase
      .from("live_classes")
      .update({ status: 'cancelled' })
      .eq("id", params.classId);

    if (deleteError) {
      console.error("Error deleting live class:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete live class" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in live class DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}