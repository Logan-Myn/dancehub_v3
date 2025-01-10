import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type MemberWithProfile = {
  user_id: string;
  users: {
    id: string;
    display_name: string | null;
    image_url: string | null;
  };
  communities: {
    slug: string;
  };
};

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community and its members with user profiles
    const { data: members, error } = await supabaseAdmin
      .from("community_members")
      .select(`
        user_id,
        users:profiles!inner(
          id,
          display_name,
          image_url
        ),
        communities!inner(
          slug
        )
      `)
      .eq("communities.slug", params.communitySlug)
      .eq("status", "active")
      .returns<MemberWithProfile[]>();

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const formattedMembers = members.map(member => ({
      id: member.user_id,
      displayName: member.users.display_name || 'Anonymous',
      imageUrl: member.users.image_url || '',
    }));

    return NextResponse.json({
      members: formattedMembers,
      totalMembers: formattedMembers.length
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
