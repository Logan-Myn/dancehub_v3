import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

interface CommunityMember {
  user_id: string;
  user: {
    email: string;
    full_name: string;
  };
}

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string };
  }
) {
  try {
    const supabase = createAdminClient();

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Get course with basic info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        slug,
        is_public
      `)
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      console.error("Error fetching course:", courseError);
      return new NextResponse("Course not found", { status: 404 });
    }

    // Get chapters with explicit ordering
    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("*")
      .eq("course_id", course.id)
      .order("chapter_position", { ascending: true });

    if (chaptersError) {
      console.error("Error fetching chapters:", chaptersError);
      return new NextResponse("Failed to fetch chapters", { status: 500 });
    }

    console.log('Fetched chapters:', chapters.map(c => ({
      id: c.id,
      title: c.title,
      chapter_position: c.chapter_position
    })));

    // Get lessons for each chapter with explicit ordering
    const chaptersWithLessons = await Promise.all(
      chapters.map(async (chapter) => {
        console.log(`Fetching lessons for chapter ${chapter.id} (${chapter.title})`);
        
        // Get raw lessons data directly from database with explicit ordering
        const { data: lessons, error: lessonsError } = await supabase
          .from("lessons")
          .select("*")
          .eq("chapter_id", chapter.id)
          .order("lesson_position", { ascending: true });

        if (lessonsError) {
          console.error("Error fetching lessons:", lessonsError);
          throw lessonsError;
        }

        console.log(`Raw lessons for chapter ${chapter.id}:`, 
          lessons.map(l => ({
            id: l.id,
            title: l.title,
            lesson_position: l.lesson_position
          }))
        );

        // Return chapter with its raw lessons data
        return {
          ...chapter,
          lessons: lessons
        };
      })
    );

    const fullCourse = {
      ...course,
      chapters: chaptersWithLessons
    };

    console.log('Final data structure:', {
      course_id: course.id,
      chapters: fullCourse.chapters.map((c: any) => ({
        id: c.id,
        title: c.title,
        chapter_position: c.chapter_position,
        lessons: c.lessons.map((l: any) => ({
          id: l.id,
          title: l.title,
          lesson_position: l.lesson_position
        }))
      }))
    });

    console.log('Final data being sent:', JSON.stringify(fullCourse, null, 2));

    return new NextResponse(JSON.stringify(fullCourse), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error("Error in course route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string };
  }
) {
  try {
    const supabase = createAdminClient();

    // Get community with more details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Get current course state to check if visibility is changing
    const { data: currentCourse, error: courseError } = await supabase
      .from("courses")
      .select("id, is_public")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !currentCourse) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const formData = await req.formData();
    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const isPublicValue = formData.get("is_public");

    const title = typeof titleValue === 'string' ? titleValue : '';
    const description = typeof descriptionValue === 'string' ? descriptionValue : '';
    const isPublic = isPublicValue === 'true';

    console.log('Visibility values:', {
      currentVisibility: currentCourse.is_public,
      newVisibility: isPublic,
      formData: Object.fromEntries(formData.entries())
    });

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from("courses")
      .update({
        title,
        description,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentCourse.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating course:", updateError);
      return new NextResponse("Failed to update course", { status: 500 });
    }

    // Return the updated course along with a flag indicating if it was made public
    return new NextResponse(JSON.stringify({
      course: updatedCourse,
      madePublic: isPublic && !currentCourse.is_public
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in PUT course route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 