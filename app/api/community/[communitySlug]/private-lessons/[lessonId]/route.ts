import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { CreatePrivateLessonData } from "@/types/private-lessons";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; lessonId: string } }
) {
  try {
    const { communitySlug, lessonId } = params;

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

    // Get the specific private lesson
    const { data: lesson, error: lessonError } = await supabase
      .from("private_lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("community_id", community.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Private lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error in GET /api/community/[communitySlug]/private-lessons/[lessonId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { communitySlug: string; lessonId: string } }
) {
  try {
    const { communitySlug, lessonId } = params;
    const updateData: Partial<CreatePrivateLessonData> & { is_active?: boolean } = await request.json();

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

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user || user.id !== community.created_by) {
      return NextResponse.json(
        { error: "Unauthorized - only community creators can update private lessons" },
        { status: 403 }
      );
    }

    // Validate update data
    if (updateData.regular_price && updateData.regular_price <= 0) {
      return NextResponse.json(
        { error: "Regular price must be greater than 0" },
        { status: 400 }
      );
    }

    if (updateData.member_price && updateData.regular_price && updateData.member_price > updateData.regular_price) {
      return NextResponse.json(
        { error: "Member price cannot be greater than regular price" },
        { status: 400 }
      );
    }

    // Update the private lesson
    const { data: lesson, error: updateError } = await supabase
      .from("private_lessons")
      .update(updateData)
      .eq("id", lessonId)
      .eq("community_id", community.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating private lesson:", updateError);
      return NextResponse.json(
        { error: "Failed to update private lesson" },
        { status: 500 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { error: "Private lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error in PUT /api/community/[communitySlug]/private-lessons/[lessonId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { communitySlug: string; lessonId: string } }
) {
  try {
    const { communitySlug, lessonId } = params;
    const { is_active } = await request.json();

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

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user || user.id !== community.created_by) {
      return NextResponse.json(
        { error: "Unauthorized - only community creators can update private lessons" },
        { status: 403 }
      );
    }

    // Update only the is_active status
    const { data: lesson, error: updateError } = await supabase
      .from("private_lessons")
      .update({ is_active })
      .eq("id", lessonId)
      .eq("community_id", community.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating lesson status:", updateError);
      return NextResponse.json(
        { error: "Failed to update lesson status" },
        { status: 500 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { error: "Private lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Error in PATCH /api/community/[communitySlug]/private-lessons/[lessonId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { communitySlug: string; lessonId: string } }
) {
  try {
    const { communitySlug, lessonId } = params;

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

    // Get the current user from authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user || user.id !== community.created_by) {
      return NextResponse.json(
        { error: "Unauthorized - only community creators can delete private lessons" },
        { status: 403 }
      );
    }

    // Check if there are any pending or scheduled bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("lesson_bookings")
      .select("id")
      .eq("private_lesson_id", lessonId)
      .in("lesson_status", ["booked", "scheduled"]);

    if (bookingsError) {
      console.error("Error checking bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to check existing bookings" },
        { status: 500 }
      );
    }

    if (bookings && bookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete lesson with pending or scheduled bookings. Please complete or cancel them first." },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { data: lesson, error: deleteError } = await supabase
      .from("private_lessons")
      .update({ is_active: false })
      .eq("id", lessonId)
      .eq("community_id", community.id)
      .select()
      .single();

    if (deleteError) {
      console.error("Error deleting private lesson:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete private lesson" },
        { status: 500 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { error: "Private lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Private lesson deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/community/[communitySlug]/private-lessons/[lessonId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 