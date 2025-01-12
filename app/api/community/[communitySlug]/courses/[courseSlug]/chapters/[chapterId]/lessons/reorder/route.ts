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
    const { lessons } = await req.json();
    console.log('Received lessons to reorder:', lessons);

    const supabase = createAdminClient();

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

    // Update each lesson's position
    for (const [index, lesson] of lessons.entries()) {
      console.log(`Updating lesson ${lesson.id} to position ${index}`);
      
      const { error: updateError } = await supabase
        .from('lessons')
        .update({ lesson_position: index })
        .eq('id', lesson.id)
        .eq('chapter_id', params.chapterId);

      if (updateError) {
        console.error("Error updating lesson position:", updateError);
        throw updateError;
      }
    }

    // Fetch the updated lessons
    const { data: updatedLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .eq('chapter_id', params.chapterId)
      .order('lesson_position', { ascending: true });

    if (fetchError) {
      console.error("Error fetching updated lessons:", fetchError);
      throw fetchError;
    }

    console.log('Updated lessons from database:', updatedLessons);

    // Transform lessons for frontend compatibility
    const transformedLessons = updatedLessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      lesson_position: lesson.lesson_position,
      chapter_id: lesson.chapter_id,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      created_by: lesson.created_by,
      videoAssetId: lesson.video_asset_id,
      playbackId: lesson.playback_id
    }));

    return NextResponse.json(transformedLessons);
  } catch (error) {
    console.error("Error in reorder lessons:", error);
    return new NextResponse("Failed to update lessons order", { status: 500 });
  }
}
