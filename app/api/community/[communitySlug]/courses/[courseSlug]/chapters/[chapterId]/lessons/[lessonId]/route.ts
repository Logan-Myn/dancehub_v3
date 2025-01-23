import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  const supabase = createAdminClient();
  
  try {
    console.log("Updating lesson with params:", params);
    const { title, content, videoAssetId } = await request.json();
    console.log("Update data received:", { title, content, videoAssetId });

    // First, verify the community exists and get its ID
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get the course ID
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Verify the chapter exists
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id")
      .eq("course_id", course.id)
      .eq("id", params.chapterId)
      .single();

    if (chapterError || !chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (videoAssetId !== undefined) {
      updateData.video_asset_id = videoAssetId;
      updateData.playback_id = videoAssetId; // Use the same ID for playback
    }

    console.log("Final update data:", updateData);

    // Update the lesson
    const { data: updatedLesson, error: updateError } = await supabase
      .from("lessons")
      .update(updateData)
      .eq("id", params.lessonId)
      .eq("chapter_id", params.chapterId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error updating lesson:", updateError);
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Transform the response for frontend compatibility
    const transformedLesson = {
      ...updatedLesson,
      order: updatedLesson.position,
      videoAssetId: updatedLesson.video_asset_id,
      playbackId: updatedLesson.playback_id,
    };

    console.log("Updated lesson data:", transformedLesson);

    return NextResponse.json(transformedLesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string; lessonId: string } }
) {
  const supabase = createAdminClient();
  
  try {
    // Verify auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, created_by")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Verify user is community creator
    if (community.created_by !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get course and verify it exists
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Verify chapter exists
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id")
      .eq("course_id", course.id)
      .eq("id", params.chapterId)
      .single();

    if (chapterError || !chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // Delete the lesson
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", params.lessonId)
      .eq("chapter_id", params.chapterId);

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError);
      return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 });
    }

    return NextResponse.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
} 