import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;
    const supabase = createAdminClient();

    // Get community by slug
    const { data: community, error } = await supabase
      .from('communities')
      .select(`
        id,
        created_at,
        name,
        slug,
        description,
        image_url,
        created_by,
        price,
        currency,
        membership_enabled,
        membership_price,
        stripe_account_id,
        stripe_price_id,
        stripe_onboarding_type,
        community_members:community_members(count)
      `)
      .eq('slug', communitySlug)
      .single();

    if (error) throw error;
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    console.log('Raw community data from DB:', community);
    console.log('stripe_account_id value:', community.stripe_account_id);

    // Get the count of members
    const membersCount = community.community_members[0]?.count || 0;

    const communityData = {
      ...community,
      membersCount,
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