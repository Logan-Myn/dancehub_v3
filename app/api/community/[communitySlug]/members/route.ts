import { NextResponse } from "next/server";
import { sql, query, queryOne } from "@/lib/db";

interface CommunityId {
  id: string;
}

interface MemberWithProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  joined_at: string;
  status: string | null;
  last_active: string | null;
  user_id: string;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community ID first
    const community = await queryOne<CommunityId>`
      SELECT id
      FROM communities
      WHERE slug = ${params.communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get members with their profiles
    const membersData = await query<MemberWithProfile>`
      SELECT *
      FROM community_members_with_profiles
      WHERE community_id = ${community.id}
    `;

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
