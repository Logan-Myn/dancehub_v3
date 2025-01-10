import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    console.log("API: Fetching course with params:", params);
    const supabase = createClient();

    // First get the community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.log("Community not found");
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Get the course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        slug,
        chapters (
          id,
          title,
          order,
          lessons (
            id,
            title,
            content,
            videoAssetId,
            order,
            createdAt,
            updatedAt,
            createdBy
          )
        )
      `)
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      console.log("Course not found");
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Sort chapters and lessons by order
    const sortedCourse = {
      ...course,
      chapters: course.chapters
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(chapter => ({
          ...chapter,
          lessons: chapter.lessons
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        }))
    };

    console.log("API: Successfully fetched course data with lessons:", {
      chaptersCount: sortedCourse.chapters.length,
      lessonsCount: sortedCourse.chapters.reduce((acc, chapter) => acc + chapter.lessons.length, 0),
    });

    return NextResponse.json(sortedCourse);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
} 