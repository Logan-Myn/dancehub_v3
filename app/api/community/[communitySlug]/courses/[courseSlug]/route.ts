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

    // Add a small delay to allow for Supabase replication
    await new Promise(resolve => setTimeout(resolve, 100));

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

    console.log("Course fetched at:", new Date().toISOString(), "Course data:", course);

    return NextResponse.json(course, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
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