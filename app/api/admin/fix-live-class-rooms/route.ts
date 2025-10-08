import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoRoomService } from "@/lib/video-room-service";

/**
 * Admin endpoint to retroactively create Daily.co rooms for live classes that don't have them
 * This is useful for fixing classes that were created before the video room creation was implemented
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Get all live classes without Daily.co rooms
    const { data: classesWithoutRooms, error } = await supabase
      .from("live_classes")
      .select("id, title, scheduled_start_time")
      .is("daily_room_name", null)
      .eq("status", "scheduled");

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    if (!classesWithoutRooms || classesWithoutRooms.length === 0) {
      return NextResponse.json({
        message: "No classes need fixing",
        fixed: 0,
        failed: 0,
      });
    }

    const results = {
      total: classesWithoutRooms.length,
      fixed: 0,
      failed: 0,
      errors: [] as { classId: string; title: string; error: string }[],
    };

    // Create Daily.co rooms for each class
    for (const liveClass of classesWithoutRooms) {
      console.log(`Creating video room for class: ${liveClass.title} (${liveClass.id})`);

      const result = await videoRoomService.createRoomForLiveClass(liveClass.id);

      if (result.success) {
        results.fixed++;
        console.log(`✅ Successfully created room for class: ${liveClass.title}`);
      } else {
        results.failed++;
        results.errors.push({
          classId: liveClass.id,
          title: liveClass.title,
          error: result.error || "Unknown error",
        });
        console.error(`❌ Failed to create room for class: ${liveClass.title}`, result.error);
      }
    }

    return NextResponse.json({
      message: `Processed ${results.total} classes`,
      ...results,
    });
  } catch (error) {
    console.error("Error in fix-live-class-rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
