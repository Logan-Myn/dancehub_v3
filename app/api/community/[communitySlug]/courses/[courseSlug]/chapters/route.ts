import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string; courseSlug: string } }
) {
  try {
    const { communitySlug, courseSlug } = params;
    const { title } = await request.json();

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabaseAdmin
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

    // Get course and verify it exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get the current highest order
    const { data: highestOrderChapter } = await supabaseAdmin
      .from("chapters")
      .select("order")
      .eq("course_id", course.id)
      .order("order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (highestOrderChapter?.order ?? -1) + 1;

    // Create the new chapter
    const { data: newChapter, error: createError } = await supabaseAdmin
      .from("chapters")
      .insert({
        title,
        order: newOrder,
        course_id: course.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating chapter:", createError);
      return NextResponse.json(
        { error: "Failed to create chapter" },
        { status: 500 }
      );
    }

    return NextResponse.json(newChapter);
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string; chapterId: string };
  }
) {
  try {
    const { communitySlug, courseSlug, chapterId } = params;
    const { title } = await request.json();

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabaseAdmin
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

    // Get course and verify it exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Update the chapter
    const { error: updateError } = await supabaseAdmin
      .from("chapters")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chapterId)
      .eq("course_id", course.id);

    if (updateError) {
      console.error("Error updating chapter:", updateError);
      return NextResponse.json(
        { error: "Failed to update chapter" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Chapter updated successfully" });
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: { communitySlug: string; courseSlug: string; chapterId: string };
  }
) {
  try {
    const { communitySlug, courseSlug, chapterId } = params;

    // Get community and verify it exists
    const { data: community, error: communityError } = await supabaseAdmin
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

    // Get course and verify it exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("community_id", community.id)
      .eq("slug", courseSlug)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Delete all lessons in the chapter first (foreign key constraint)
    const { error: lessonsDeleteError } = await supabaseAdmin
      .from("lessons")
      .delete()
      .eq("chapter_id", chapterId);

    if (lessonsDeleteError) {
      console.error("Error deleting lessons:", lessonsDeleteError);
      return NextResponse.json(
        { error: "Failed to delete lessons" },
        { status: 500 }
      );
    }

    // Delete the chapter
    const { error: deleteError } = await supabaseAdmin
      .from("chapters")
      .delete()
      .eq("id", chapterId)
      .eq("course_id", course.id);

    if (deleteError) {
      console.error("Error deleting chapter:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete chapter" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Chapter deleted successfully" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Failed to delete chapter" },
      { status: 500 }
    );
  }
}
