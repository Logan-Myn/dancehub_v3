import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const supabase = createAdminClient();
  
  try {
    const { userId } = await request.json();

    // Get community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if user is a member
    const { data: member } = await supabase
      .from('community_members')
      .select()
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this community' },
        { status: 400 }
      );
    }

    // Remove member from community_members table
    const { error: deleteError } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    // Update members_count in communities table
    const { error: updateError } = await supabase.rpc(
      'decrement_members_count',
      { community_id: community.id }
    );

    if (updateError) {
      console.error('Error updating members count:', updateError);
      // Try to rollback the member deletion
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: userId,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at,
          subscription_status: member.subscription_status,
          payment_intent_id: member.payment_intent_id
        });

      return NextResponse.json(
        { error: 'Failed to update members count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving community:', error);
    return NextResponse.json(
      { error: 'Failed to leave community' },
      { status: 500 }
    );
  }
} 