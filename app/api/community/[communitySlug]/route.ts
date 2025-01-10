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
        *,
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

    // Get the count of members
    const membersCount = community.community_members[0]?.count || 0;

    const communityData = {
      ...community,
      membersCount,
    };

    return NextResponse.json(communityData);
  } catch (error) {
    console.error('Error fetching community:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community' },
      { status: 500 }
    );
  }
} 