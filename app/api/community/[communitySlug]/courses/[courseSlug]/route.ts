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

    // Get course with chapters and lessons
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        chapters:chapters (
          *,
          lessons:lessons (*)
        )
      `)
      .eq("community_id", community.id)
      .eq("slug", courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Transform the data to include order for frontend compatibility
    const transformedCourse = {
      ...course,
      chapters: course.chapters?.map((chapter: Chapter) => ({
        ...chapter,
        order: chapter.position,
        lessons: chapter.lessons?.map((lesson: Lesson) => ({
          ...lesson,
          order: lesson.position
        }))
      }))
    };

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 