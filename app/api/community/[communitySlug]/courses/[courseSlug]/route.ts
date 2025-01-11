import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    console.log("API: Fetching course with params:", params);
    const supabase = createAdminClient();

    // First get the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.log("Community not found:", communityError);
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get the course with all related data
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        image_url,
        slug,
        created_at,
        updated_at,
        community_id,
        chapters (
          id,
          title,
          position,
          created_at,
          updated_at,
          lessons (
            id,
            title,
            content,
            video_asset_id,
            position,
            created_at,
            updated_at,
            created_by
          )
        )
      `)
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      console.log("Course not found:", courseError);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Transform the response to match the expected structure
    const transformedCourse = {
      ...course,
      chapters: course.chapters
        ?.map(chapter => ({
          ...chapter,
          order: chapter.position,
          lessons: (chapter.lessons || [])
            .map(lesson => ({
              ...lesson,
              videoAssetId: lesson.video_asset_id,
              order: lesson.position
            }))
            .sort((a, b) => (a.position || 0) - (b.position || 0))
        }))
        .sort((a, b) => (a.position || 0) - (b.position || 0)) || []
    };

    console.log("API: Successfully fetched course data:", {
      courseId: transformedCourse.id,
      chaptersCount: transformedCourse.chapters.length,
      lessonsCount: transformedCourse.chapters.reduce((acc, chapter) => acc + chapter.lessons.length, 0),
    });

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 