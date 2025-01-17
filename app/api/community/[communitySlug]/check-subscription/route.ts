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

    // Check member status
    const { data: member, error: memberError } = await supabase
      .from('community_members')
      .select('status, subscription_status')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      console.error('Error checking member status:', memberError);
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'Error checking member status' 
      });
    }

    if (!member) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'Not a member of this community' 
      });
    }

    // Check if member is active
    const isActive = member.status === 'active';
    
    return NextResponse.json({
      hasSubscription: isActive,
      status: member.status,
      subscriptionStatus: member.subscription_status,
      message: isActive ? 'Member is active' : 'Member is not active'
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
} 