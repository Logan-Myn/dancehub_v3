import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface CommunityWithMembersCount {
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
  members_count: number;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community by slug with members count
    const community = await queryOne<CommunityWithMembersCount>`
      SELECT
        c.id,
        c.created_at,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.created_by,
        c.price,
        c.currency,
        c.membership_enabled,
        c.membership_price,
        c.stripe_account_id,
        c.stripe_price_id,
        c.stripe_onboarding_type,
        (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id)::int as members_count
      FROM communities c
      WHERE c.slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    console.log('=== DEBUG: Community API ===');
    console.log('DATABASE_URL endpoint:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);
    console.log('Raw community data from DB:', JSON.stringify(community, null, 2));
    console.log('stripe_account_id value:', community.stripe_account_id);
    console.log('typeof stripe_account_id:', typeof community.stripe_account_id);
    console.log('=== END DEBUG ===');

    const communityData = {
      ...community,
      membersCount: community.members_count,
      community_members: [{ count: community.members_count }],
    };

    console.log('Final community data being returned:', communityData);
    console.log('stripe_account_id in final data:', communityData.stripe_account_id);

    return NextResponse.json(communityData);
  } catch (error) {
    console.error('Error fetching community:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community' },
      { status: 500 }
    );
  }
}
