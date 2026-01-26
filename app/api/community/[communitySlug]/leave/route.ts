import { NextResponse } from 'next/server';
import { queryOne, sql } from '@/lib/db';
import { stripe } from "@/lib/stripe";

interface Community {
  id: string;
  stripe_account_id: string | null;
}

interface Member {
  user_id: string;
  community_id: string;
  role: string;
  status: string;
  joined_at: string;
  subscription_status: string | null;
  payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();

    // Get community with stripe account id
    const community = await queryOne<Community>`
      SELECT id, stripe_account_id
      FROM communities
      WHERE slug = ${params.communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check if user is a member and get their subscription info
    const member = await queryOne<Member>`
      SELECT *
      FROM community_members
      WHERE community_id = ${community.id}
        AND user_id = ${userId}
    `;

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
        // Keep status as 'active' so user maintains access until period end
        // Set subscription_status to 'canceling' to indicate pending cancellation
        await sql`
          UPDATE community_members
          SET subscription_status = 'canceling', current_period_end = ${accessEndDate.toISOString()}
          WHERE community_id = ${community.id}
            AND user_id = ${userId}
        `;

        return NextResponse.json({
          success: true,
          accessEndDate: accessEndDate.toISOString(),
          gracePeriod: true
        });
      } catch (error) {
        console.error('Error canceling subscription:', error);
        return NextResponse.json(
          { error: 'Failed to cancel subscription. Please try again.' },
          { status: 500 }
        );
      }
    }

    // For free members or if there's no subscription, remove immediately
    await sql`
      DELETE FROM community_members
      WHERE community_id = ${community.id}
        AND user_id = ${userId}
    `;

    // Update members_count in communities table
    try {
      await sql`SELECT decrement_members_count(${community.id})`;
    } catch (rpcError) {
      console.error('Error updating members count:', rpcError);
      // Try to rollback the member deletion
      await sql`
        INSERT INTO community_members (
          community_id,
          user_id,
          role,
          status,
          joined_at,
          subscription_status,
          payment_intent_id,
          stripe_subscription_id,
          current_period_end
        ) VALUES (
          ${community.id},
          ${userId},
          ${member.role},
          ${member.status},
          ${member.joined_at},
          ${member.subscription_status},
          ${member.payment_intent_id},
          ${member.stripe_subscription_id},
          ${member.current_period_end}
        )
      `;

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
