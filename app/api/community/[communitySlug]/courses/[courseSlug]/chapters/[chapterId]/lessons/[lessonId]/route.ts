import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { deleteMuxAsset } from "@/lib/mux";

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: {
      communitySlug: string;
      courseSlug: string;
      chapterId: string;
      lessonId: string;
    };
  }
) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { title, content, videoAssetId, playbackId } = body;

    // First, verify the community exists and get its ID
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
    if (videoAssetId !== undefined) updateData.video_asset_id = videoAssetId;
    if (playbackId !== undefined) updateData.playback_id = playbackId;

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
  {
    params,
  }: {
    params: {
      communitySlug: string;
      courseSlug: string;
      chapterId: string;
      lessonId: string;
    };
  }
) {
  const supabase = createAdminClient();

  try {
    // Verify auth token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

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
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
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

    // Get the lesson to check if it has a video before deleting
    const { data: lesson, error: lessonFetchError } = await supabase
      .from("lessons")
      .select("video_asset_id")
      .eq("id", params.lessonId)
      .eq("chapter_id", params.chapterId)
      .single();

    if (!lessonFetchError && lesson?.video_asset_id) {
      // Delete the video from Mux if it exists
      await deleteMuxAsset(lesson.video_asset_id);
    }

    // Delete the lesson
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("id", params.lessonId)
      .eq("chapter_id", params.chapterId);

    if (deleteError) {
      console.error("Error deleting lesson:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Lesson and associated video deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
