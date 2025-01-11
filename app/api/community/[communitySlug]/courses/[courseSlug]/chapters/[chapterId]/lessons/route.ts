import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

export async function POST(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string; chapterId: string } }
) {
  try {
    // Verify auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
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

    // Get current highest position
    const { data: highestPositionLesson } = await supabase
      .from("lessons")
      .select("position")
      .eq("chapter_id", params.chapterId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const newPosition = (highestPositionLesson?.position ?? -1) + 1;

    // Create the new lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        title,
        content: "",
        video_asset_id: null,
        position: newPosition,
        chapter_id: params.chapterId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (lessonError) {
      console.error("Error creating lesson:", lessonError);
      return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
    }

    // Transform the response to include order for frontend compatibility
    const transformedLesson = {
      ...lesson,
      order: lesson.position,
    };

    return NextResponse.json(transformedLesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}
