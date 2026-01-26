import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface CommunityWithMemberCount {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  price: number | null;
  currency: string | null;
  membership_enabled: boolean;
  membership_price: number | null;
  stripe_account_id: string | null;
  stripe_price_id: string | null;
  stripe_onboarding_type: string | null;
  status: string;
  opening_date: string | null;
  thread_categories: unknown;
  custom_links: unknown;
  members_count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const dbHost = process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown';
    console.log('[API Debug] DB Host:', dbHost);
    console.log('[API Debug] Fetching communities for userId:', userId);

    // First, check if the user exists in community_members
    const memberCheck = await sql`
      SELECT user_id, community_id FROM community_members WHERE user_id = ${userId}
    `;
    console.log('[API Debug] Member check:', JSON.stringify(memberCheck));

    // Get communities that the user is a member of, with member count
    const communities = await sql`
      SELECT
        c.*,
        COALESCE((SELECT COUNT(*) FROM community_members WHERE community_id = c.id), 0)::int as members_count
      FROM communities c
      INNER JOIN community_members cm ON cm.community_id = c.id
      WHERE cm.user_id = ${userId}
      ORDER BY c.created_at DESC
    ` as CommunityWithMemberCount[];

    console.log('[API Debug] Found communities:', communities?.length || 0);
    console.log('[API Debug] Raw result:', JSON.stringify(communities?.slice(0, 1)));

    return NextResponse.json(
      communities.map((community) => ({
        ...community,
        members_count: community.members_count,
      }))
    );
  } catch (error) {
    console.error("Error fetching user communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch user communities" },
      { status: 500 }
    );
  }
}
