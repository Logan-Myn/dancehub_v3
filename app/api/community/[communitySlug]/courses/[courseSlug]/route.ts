import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import { headers } from "next/headers";
import { uploadFile, generateFileKey, deleteFile } from "@/lib/storage";

const supabase = createAdminClient();

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_asset_id: string | null;
  chapter_id: string;
  lesson_position: number;
  playback_id: string | null;
  [key: string]: any;
}

interface Chapter {
  id: string;
  title: string;
  chapter_position: number;
  lessons: Lesson[];
  [key: string]: any;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    console.log("GET Course request params:", {
      communitySlug: params.communitySlug,
      courseSlug: params.courseSlug,
      timestamp: new Date().toISOString(),
    });

    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.error("Error fetching community:", {
        error: communityError,
        slug: params.communitySlug,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    console.log("Found community:", {
      id: community.id,
      slug: params.communitySlug,
      timestamp: new Date().toISOString(),
    });

    // Get course with retries to ensure consistency
    let course = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      console.log(`Attempt ${attempts + 1} to fetch course`);
      const { data: fetchedCourse, error: courseError } = await supabase
        .from("courses")
        .select(
          `
          *,
          chapters(
            *,
            lessons(*)
          )
        `
        )
        .eq("community_id", community.id)
        .eq("slug", params.courseSlug)
        .single();

      if (courseError) {
        console.error(`Attempt ${attempts + 1} failed:`, {
          error: courseError,
          communityId: community.id,
          courseSlug: params.courseSlug,
        });
      }

      if (!courseError && fetchedCourse) {
        course = fetchedCourse;
        console.log("Successfully fetched course on attempt", attempts + 1);
        console.log("Raw course data:", JSON.stringify(course, null, 2));
        console.log("Chapters data:", JSON.stringify(course.chapters, null, 2));
        if (course.chapters) {
          course.chapters.forEach((chapter: Chapter, i: number) => {
            console.log(
              `Chapter ${i + 1} lessons:`,
              JSON.stringify(chapter.lessons, null, 2)
            );
          });
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      attempts++;
    }

    if (!course) {
      console.error("Failed to fetch course after multiple attempts");
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get user from auth header
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    let userId = null;

    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id;
    }

    // If user is authenticated, fetch completion status
    let completedLessonIds = new Set<string>();
    if (userId) {
      const { data: completions } = await supabase
        .from('lesson_completions')
        .select('lesson_id')
        .eq('user_id', userId);
      
      if (completions) {
        completedLessonIds = new Set(completions.map(c => c.lesson_id));
      }
    }

    // Transform the data to ensure video fields are included
    const transformedCourse = {
      ...course,
      chapters: course.chapters?.map((chapter: Chapter) => ({
        ...chapter,
        lessons: chapter.lessons?.map((lesson: Lesson) => ({
          ...lesson,
          videoAssetId: lesson.video_asset_id,
          playbackId: lesson.playback_id,
          completed: completedLessonIds.has(lesson.id)
        })) || []
      })) || []
    };

    // Log the final transformed data
    console.log(
      "Transformed course data:",
      JSON.stringify(transformedCourse, null, 2)
    );

    return NextResponse.json(transformedCourse, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error in GET course route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get the community
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

    // Parse the form data
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const imageFile = formData.get("image") as File;

    // Generate the slug from the title
    const slug = slugify(title);

    // Upload the image to B2 Storage
    let imageUrl: string;
    let fileKey: string;

    try {
      // Convert File to Buffer
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique file key
      fileKey = generateFileKey('course-images', imageFile.name);

      // Upload to B2 Storage
      imageUrl = await uploadFile(buffer, fileKey, imageFile.type);
    } catch (uploadError) {
      console.error("Error uploading image:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Create a new course
    const { data: newCourse, error: courseError } = await supabase
      .from("courses")
      .insert({
        title,
        description,
        image_url: imageUrl,
        slug,
        community_id: community.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (courseError) {
      console.error("Error creating course:", courseError);
      // Clean up the uploaded image if course creation fails
      try {
        await deleteFile(fileKey);
      } catch (deleteError) {
        console.error("Error cleaning up uploaded file:", deleteError);
      }
      return NextResponse.json(
        { error: "Failed to create course" },
        { status: 500 }
      );
    }

    return NextResponse.json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const supabase = createAdminClient();

    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name, created_by")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.error("Error fetching community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get current course
    const { data: currentCourse, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !currentCourse) {
      console.error("Error fetching course:", courseError);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const isPublic = formData.get("is_public") === "true";

    // Update the course
    const { error: updateError } = await supabase
      .from("courses")
      .update({
        title,
        description,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentCourse.id);

    if (updateError) {
      console.error("Error updating course:", updateError);
      return NextResponse.json(
        { error: "Failed to update course" },
        { status: 500 }
      );
    }

    // If the course was made public, create in-app notifications
    if (isPublic && !currentCourse.is_public) {
      // Get all community members except the creator
      const { data: members, error: membersError } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", community.id)
        .neq("user_id", community.created_by); // Exclude the creator

      if (membersError) {
        console.error("Error fetching members:", membersError);
      } else {
        // Create the course URL
        const courseUrl = `/community/${params.communitySlug}/classroom/${params.courseSlug}`;

        // Create notifications for all members except creator
        if (members && members.length > 0) {
          const { error: notificationsError } = await supabase
            .from("notifications")
            .insert(
              members.map((member) => ({
                user_id: member.user_id,
                title: `New Course Available: ${title}`,
                message: `A new course is now available in your community: ${community.name}`,
                link: courseUrl,
                type: "course_published",
              }))
            );

          if (notificationsError) {
            console.error("Error creating notifications:", notificationsError);
          }
        }
      }
    }

    // Fetch updated course with retries
    let updatedCourse = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const { data: fetchedCourse, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", currentCourse.id)
        .single();

      if (
        !fetchError &&
        fetchedCourse &&
        fetchedCourse.is_public === isPublic
      ) {
        updatedCourse = fetchedCourse;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      attempts++;
    }

    if (!updatedCourse) {
      console.error("Failed to verify course update after multiple attempts");
      return NextResponse.json(
        { error: "Failed to verify course update" },
        { status: 500 }
      );
    }

    // Log the response for debugging
    console.log("PUT Course response:", {
      id: updatedCourse.id,
      title: updatedCourse.title,
      is_public: updatedCourse.is_public,
      updated_at: updatedCourse.updated_at,
      fetch_time: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        course: updatedCourse,
        madePublic: isPublic && !currentCourse.is_public,
      },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error in PUT course route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
