import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const supabase = createAdminClient();

    // Get community ID first
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get members with their profiles
    const { data: membersData, error: membersError } = await supabase
      .from("community_members_with_profiles")
      .select("*")
      .eq("community_id", community.id);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Format the members data
    const formattedMembers = membersData.map(member => ({
      id: member.id,
      displayName: member.full_name || 'Anonymous',
      email: member.email || '',
      imageUrl: member.avatar_url || '',
      joinedAt: member.joined_at,
      status: member.status || 'active',
      lastActive: member.last_active,
      user_id: member.user_id
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
