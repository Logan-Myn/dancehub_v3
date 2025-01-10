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
    if (videoAssetId !== undefined) updateData.video_asset_id = videoAssetId;

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

    console.log("Updated lesson data:", updatedLesson);

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
} 