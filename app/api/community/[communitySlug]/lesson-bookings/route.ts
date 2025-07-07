import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

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
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get community and verify user is the creator
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
    if (user.id !== community.created_by) {
      return NextResponse.json(
        { error: "Unauthorized - only community creators can view bookings" },
        { status: 403 }
      );
    }

    // Get lesson bookings with lesson details
    const { data: bookings, error: bookingsError } = await supabase
      .from("lesson_bookings_with_details")
      .select("*")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching lesson bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch lesson bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json(bookings || []);
  } catch (error) {
    console.error("Error in GET /api/community/[communitySlug]/lesson-bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 