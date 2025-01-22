import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { slugify } from "@/lib/utils";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.error("Error fetching community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get course with retries to ensure consistency
    let course = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const { data: fetchedCourse, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("community_id", community.id)
        .eq("slug", params.courseSlug)
        .single();

      if (!courseError && fetchedCourse) {
        course = fetchedCourse;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }

    if (!course) {
      console.error("Failed to fetch course after multiple attempts");
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Log the response for debugging
    console.log("GET Course response:", {
      id: course.id,
      title: course.title,
      is_public: course.is_public,
      updated_at: course.updated_at,
      fetch_time: new Date().toISOString()
    });

    return NextResponse.json({
      id: course.id,
      title: course.title,
      description: course.description,
      is_public: course.is_public,
      updated_at: course.updated_at
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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

    // Upload the image to Supabase Storage
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("course-images")
      .upload(fileName, imageFile, {
        contentType: imageFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get the public URL of the uploaded image
    const {
      data: { publicUrl: imageUrl },
    } = supabase.storage.from("course-images").getPublicUrl(fileName);

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
      await supabase.storage.from("course-images").remove([fileName]);
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

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const supabase = createAdminClient();

    // Get community
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, name")
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
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
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
        updated_at: new Date().toISOString()
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
      // Get all community members
      const { data: members, error: membersError } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", community.id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
      } else {
        // Create the course URL
        const courseUrl = `/community/${params.communitySlug}/classroom/${params.courseSlug}`;

        // Create notifications for all members
        const { error: notificationsError } = await supabase
          .from('notifications')
          .insert(
            members.map(member => ({
              user_id: member.user_id,
              title: `New Course Available: ${title}`,
              message: `A new course is now available in your community: ${community.name}`,
              link: courseUrl,
              type: 'course_published'
            }))
          );

        if (notificationsError) {
          console.error('Error creating notifications:', notificationsError);
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

      if (!fetchError && fetchedCourse && fetchedCourse.is_public === isPublic) {
        updatedCourse = fetchedCourse;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
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
      fetch_time: new Date().toISOString()
    });

    return NextResponse.json({
      course: updatedCourse,
      madePublic: isPublic && !currentCourse.is_public
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error("Error in PUT course route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
