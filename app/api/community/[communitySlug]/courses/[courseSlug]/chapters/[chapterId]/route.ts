import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string; chapterId: string };
  }
) {
  try {
    const supabase = createAdminClient();
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

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

    // Delete all lessons in the chapter first (foreign key constraint)
    const { error: lessonsDeleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("chapter_id", params.chapterId);

    if (lessonsDeleteError) {
      console.error("[LESSONS_DELETE]", lessonsDeleteError);
      return new NextResponse("Failed to delete lessons", { status: 500 });
    }

    // Delete the chapter
    const { error: chapterDeleteError } = await supabase
      .from("chapters")
      .delete()
      .eq("id", params.chapterId)
      .eq("course_id", course.id);

    if (chapterDeleteError) {
      console.error("[CHAPTER_DELETE]", chapterDeleteError);
      return new NextResponse("Failed to delete chapter", { status: 500 });
    }

    return NextResponse.json({
      message: "Chapter and lessons deleted successfully",
    });
  } catch (error) {
    console.error("[CHAPTER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
