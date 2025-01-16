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

    // Get member's subscription info
    const { data: member, error: memberError } = await supabase
      .from('community_members')
      .select('*, stripe_subscription_id')
      .eq('community_id', community.id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.stripe_subscription_id && community.stripe_account_id) {
      // Reactivate Stripe subscription by removing the cancellation
      await stripe.subscriptions.update(
        member.stripe_subscription_id,
        {
          cancel_at_period_end: false,
        },
        {
          stripeAccount: community.stripe_account_id,
        }
      );

      // Update member status back to active
      const { error: updateError } = await supabase
        .from('community_members')
        .update({
          status: 'active',
          subscription_status: 'active'
        })
        .eq('community_id', community.id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating member status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update member status' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'No subscription found to reactivate' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error reactivating membership:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate membership' },
      { status: 500 }
    );
  }
} 