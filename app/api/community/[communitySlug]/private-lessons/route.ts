import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CreatePrivateLessonData } from "@/types/private-lessons";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community ID from slug
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

    // Get all active private lessons for this community
    const { data: lessons, error: lessonsError } = await supabase
      .from("private_lessons")
      .select("*")
      .eq("community_id", community.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (lessonsError) {
      console.error("Error fetching private lessons:", lessonsError);
      return NextResponse.json(
        { error: "Failed to fetch private lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error in GET /api/community/[communitySlug]/private-lessons:", error);
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
    const lessonData: CreatePrivateLessonData = await request.json();

    // Get community and verify ownership
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, created_by")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Verify the current user is the community creator
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== community.created_by) {
      return NextResponse.json(
        { error: "Unauthorized - only community creators can create private lessons" },
        { status: 403 }
      );
    }

    // Validate lesson data
    if (!lessonData.title || !lessonData.duration_minutes || !lessonData.regular_price) {
      return NextResponse.json(
        { error: "Missing required fields: title, duration_minutes, regular_price" },
        { status: 400 }
      );
    }

    if (lessonData.regular_price <= 0) {
      return NextResponse.json(
        { error: "Regular price must be greater than 0" },
        { status: 400 }
      );
    }

    if (lessonData.member_price && lessonData.member_price > lessonData.regular_price) {
      return NextResponse.json(
        { error: "Member price cannot be greater than regular price" },
        { status: 400 }
      );
    }

    // Create the private lesson
    const { data: lesson, error: createError } = await supabase
      .from("private_lessons")
      .insert({
        community_id: community.id,
        ...lessonData,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating private lesson:", createError);
      return NextResponse.json(
        { error: "Failed to create private lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/community/[communitySlug]/private-lessons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 