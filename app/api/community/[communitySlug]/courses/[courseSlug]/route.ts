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

    // Add a longer delay to ensure replication
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get course with stronger consistency settings
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (courseError) {
      console.error("Error in course route:", courseError);
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Double-check the latest state
    const { data: verifyData } = await supabase
      .from("courses")
      .select("is_public, updated_at")
      .eq("id", course.id)
      .single();

    // Use the most up-to-date state
    const finalCourse = verifyData ? { ...course, ...verifyData } : course;

    console.log("Course fetched at:", new Date().toISOString(), "Course data:", finalCourse);

    return NextResponse.json(finalCourse, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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

    // Add a longer delay for replication
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch the updated course with multiple attempts
    let updatedCourse = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const { data: fetchedCourse, error: fetchError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", currentCourse.id)
        .order('updated_at', { ascending: false })
        .limit(1)
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

    console.log('Course updated successfully:', {
      id: updatedCourse.id,
      title: updatedCourse.title,
      is_public: updatedCourse.is_public,
      updated_at: updatedCourse.updated_at,
      fetch_time: new Date().toISOString(),
      madePublic: isPublic && !currentCourse.is_public,
      attempts: attempts + 1
    });

    return NextResponse.json({
      courseId: updatedCourse.id,
      title: updatedCourse.title,
      is_public: updatedCourse.is_public,
      updated_at: updatedCourse.updated_at,
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
    return new NextResponse("Internal server error", { status: 500 });
  }
} 