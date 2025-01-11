import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string; chapterId: string };
  }
) {
  try {
    const supabase = createAdminClient();
    const { lessons } = await req.json();

    // Get the authorization token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is the community creator
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, created_by")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return new NextResponse("Community not found", { status: 404 });
    }

    if (community.created_by !== user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get course ID
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", params.courseSlug)
      .single();

    if (courseError || !course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Update positions for all lessons
    const updates = lessons.map((lesson: any, index: number) => ({
      id: lesson.id,
      position: index,
    }));

    const { error: updateError } = await supabase
      .from("lessons")
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      console.error("Error updating lesson positions:", updateError);
      return new NextResponse("Failed to update lesson positions", { status: 500 });
    }

    return new NextResponse("Successfully reordered lessons", { status: 200 });
  } catch (error) {
    console.error("Error in reorder lessons:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
