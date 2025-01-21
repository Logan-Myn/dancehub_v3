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
    const supabase = await createAdminClient();

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    // Add a small delay to allow for Supabase replication
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get course with basic info, using stronger consistency
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        description,
        slug,
        is_public,
        updated_at
      `)
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (courseError) {
      console.error("Error fetching course:", courseError);
      return new NextResponse("Course not found", { status: 404 });
    }

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Log the raw course data from Supabase with timestamp info
    console.log('Raw course data from Supabase:', {
      id: course.id,
      title: course.title,
      is_public: course.is_public,
      updated_at: course.updated_at,
      fetch_time: new Date().toISOString()
    });

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

    console.log('Course data being sent:', {
      id: course.id,
      title: course.title,
      is_public: course.is_public,
      updated_at: course.updated_at,
      fetch_time: new Date().toISOString(),
      chaptersCount: chaptersWithLessons.length
    });

    return NextResponse.json(fullCourse, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '-1'
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
    const supabase = await createAdminClient();

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

    console.log('Update course request:', {
      courseId: currentCourse.id,
      currentIsPublic: currentCourse.is_public,
      newIsPublic: isPublic,
      formValues: {
        title,
        description,
        isPublic,
        rawIsPublicValue: isPublicValue
      }
    });

    const timestamp = new Date().toISOString();

    // Update the course
    const updateData = {
      title,
      description,
      is_public: isPublic,
      updated_at: timestamp,
    };

    console.log('Updating course with data:', updateData);

    // First update the course
    const { error: updateError } = await supabase
      .from("courses")
      .update(updateData)
      .eq("id", currentCourse.id);

    if (updateError) {
      console.error("Error updating course:", updateError);
      return new NextResponse("Failed to update course", { status: 500 });
    }

    // Then fetch the updated course data with a fresh query
    await new Promise(resolve => setTimeout(resolve, 100)); // Add delay for replication

    const { data: updatedCourse, error: fetchError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", currentCourse.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !updatedCourse) {
      console.error("Error fetching updated course:", fetchError);
      return new NextResponse("Failed to fetch updated course", { status: 500 });
    }

    console.log('Course updated successfully:', {
      id: updatedCourse.id,
      title: updatedCourse.title,
      is_public: updatedCourse.is_public,
      updated_at: updatedCourse.updated_at,
      fetch_time: new Date().toISOString(),
      madePublic: isPublic && !currentCourse.is_public
    });

    // Return the updated course along with a flag indicating if it was made public
    return NextResponse.json({
      course: updatedCourse,
      madePublic: isPublic && !currentCourse.is_public
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Surrogate-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '-1'
      }
    });
  } catch (error) {
    console.error("Error in PUT course route:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 