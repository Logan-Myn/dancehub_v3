import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Course, Chapter, Lesson } from "@/types/course";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const supabase = createAdminClient();
    const { communitySlug, courseSlug } = params;

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get course with chapters and lessons, ordered by position
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        chapters:chapters (
          *,
          lessons:lessons (
            id,
            title,
            content,
            video_asset_id,
            playback_id,
            position,
            created_at,
            updated_at,
            created_by
          )
        )
      `)
      .eq("community_id", community.id)
      .eq("slug", courseSlug)
      .order('position', { foreignTable: 'chapters' })
      .order('position', { foreignTable: 'chapters.lessons' })
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    console.log("Raw course data:", JSON.stringify(course, null, 2));

    // Transform the data to include order for frontend compatibility
    const transformedCourse = {
      ...course,
      chapters: course.chapters?.map((chapter: Chapter) => ({
        ...chapter,
        order: chapter.position,
        lessons: chapter.lessons?.map((lesson: Lesson) => {
          console.log("Processing lesson:", lesson.id, {
            video_asset_id: lesson.video_asset_id,
            playback_id: lesson.playback_id
          });
          
          return {
            ...lesson,
            order: lesson.position,
            videoAssetId: lesson.video_asset_id,
            playbackId: lesson.playback_id
          };
        })
      }))
    };

    console.log("Transformed course data:", JSON.stringify(transformedCourse, null, 2));

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 