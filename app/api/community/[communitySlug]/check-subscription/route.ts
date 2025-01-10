import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const supabase = createAdminClient();
    const { userId } = await request.json();
    const { communitySlug } = params;

    // Get community data
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check membership record
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'No subscription found' 
      });
    }

    // If subscription is active, add user to community if not already a member
    if (membership.status === 'active') {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('user_id', userId)
        .single();

      // If not a member, add them
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('community_members')
          .insert({
            community_id: community.id,
            user_id: userId,
            role: 'member',
            joined_at: new Date().toISOString(),
          });

        if (memberError) throw memberError;
      }

      return NextResponse.json({
        hasSubscription: true,
        status: 'active',
        message: 'Subscription is active and user added to community',
        startDate: membership.start_date,
        currentPeriodEnd: membership.current_period_end,
      });
    }

    return NextResponse.json({
      hasSubscription: false,
      status: membership.status,
      message: 'Subscription is not active',
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
} 