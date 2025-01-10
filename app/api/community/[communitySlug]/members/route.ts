import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

type AuthUser = {
  id: string;
  email: string;
};

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const supabase = createAdminClient();
  
  try {
    // First get the community ID
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      console.error("Error fetching community:", communityError);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get members
    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("user_id, created_at, last_active")
      .eq("community_id", community.id);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 }
      );
    }

    // Get profiles for these members
    const userIds = members?.map(m => m.user_id) || [];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    // Get emails from auth.users using admin auth
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_users_by_ids', { user_ids: userIds })
      .returns<AuthUser[]>();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json(
        { error: "Failed to fetch user emails" },
        { status: 500 }
      );
    }

    // Create maps for profiles and auth users
    const profileMap = new Map(profiles?.map(p => [p.id, p]));
    const authMap = new Map(authUsers?.map(u => [u.id, u]));

    // Transform the data to match the expected format
    const formattedMembers = members?.map(member => {
      const profile = profileMap.get(member.user_id);
      const authUser = authMap.get(member.user_id);
      return {
        id: member.user_id,
        displayName: profile?.full_name || 'Anonymous',
        email: authUser?.email || '',
        imageUrl: profile?.avatar_url || '',
        joinedAt: member.created_at,
        lastActive: member.last_active,
        status: 'active'
      };
    }) || [];

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
