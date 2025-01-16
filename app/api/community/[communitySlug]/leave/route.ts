import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { stripe } from "@/lib/stripe";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  const supabase = createAdminClient();
  
  try {
    const { userId } = await request.json();

    // Get community with stripe account id
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, stripe_account_id')
      .eq('slug', params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if user is a member and get their subscription info
    const { data: member } = await supabase
      .from('community_members')
      .select('*, stripe_subscription_id, current_period_end')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this community' },
        { status: 400 }
      );
    }

    let accessEndDate = null;

    // If there's a Stripe subscription, cancel it at period end
    if (member.stripe_subscription_id && community.stripe_account_id) {
      try {
        const subscription = await stripe.subscriptions.update(
          member.stripe_subscription_id,
          {
            cancel_at_period_end: true,
          },
          {
            stripeAccount: community.stripe_account_id,
          }
        );

        accessEndDate = new Date(subscription.current_period_end * 1000);

        // Update member status to indicate pending cancellation
        const { error: updateError } = await supabase
          .from('community_members')
          .update({
            status: 'inactive',
            subscription_status: 'canceled'
          })
          .eq('community_id', community.id)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating member status:', updateError);
        }

        return NextResponse.json({ 
          success: true,
          accessEndDate: accessEndDate.toISOString(),
          gracePeriod: true
        });
      } catch (stripeError) {
        console.error('Error updating subscription:', stripeError);
      }
    }

    // For free members or if there's no subscription, remove immediately
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
          payment_intent_id: member.payment_intent_id,
          stripe_subscription_id: member.stripe_subscription_id,
          current_period_end: member.current_period_end
        });

      return NextResponse.json(
        { error: 'Failed to update members count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      gracePeriod: false
    });
  } catch (error) {
    console.error('Error leaving community:', error);
    return NextResponse.json(
      { error: 'Failed to leave community' },
      { status: 500 }
    );
  }
} 