import { NextResponse } from "next/server";
import { queryOne, sql } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

interface Community {
  id: string;
  membership_price: number | null;
  stripe_account_id: string | null;
  stripe_price_id: string | null;
  active_member_count: number | null;
  created_at: string;
  promotional_fee_percentage: number | null;
}

interface ExistingMember {
  id: string;
}

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId, email } = await request.json();

    // Get community with its membership price and stripe account
    const community = await queryOne<Community>`
      SELECT id, membership_price, stripe_account_id, stripe_price_id, active_member_count, created_at, promotional_fee_percentage
      FROM communities
      WHERE slug = ${params.communitySlug}
    `;

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (!community.stripe_price_id) {
      return NextResponse.json(
        { error: "Community membership price not configured" },
        { status: 400 }
      );
    }

    // Check if this member should get promotional pricing (community < 30 days old)
    const communityAge = Date.now() - new Date(community.created_at).getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isPromotional = communityAge < thirtyDaysInMs;

    // Calculate platform fee percentage
    let feePercentage = 0; // Default promotional rate

    if (!isPromotional) {
      // Use standard tiered pricing if not in promotional period
      if ((community.active_member_count || 0) <= 50) {
        feePercentage = 8.0;
      } else if ((community.active_member_count || 0) <= 100) {
        feePercentage = 6.0;
      } else {
        feePercentage = 4.0;
      }
    }

    // Check if user is already a member
    const existingMember = await queryOne<ExistingMember>`
      SELECT id
      FROM community_members
      WHERE community_id = ${community.id}
        AND user_id = ${userId}
    `;

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      );
    }

    // Create a customer in Stripe
    const customer = await stripe.customers.create(
      {
        email,
        metadata: {
          user_id: userId,
          community_id: community.id,
        },
      },
      {
        stripeAccount: community.stripe_account_id!,
      }
    );

    // Create a subscription with the calculated platform fee
    const subscription = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: community.stripe_price_id }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        },
        metadata: {
          user_id: userId,
          community_id: community.id,
          platform_fee_percentage: feePercentage
        },
        application_fee_percent: feePercentage,
        expand: ['latest_invoice.payment_intent'],
      },
      {
        stripeAccount: community.stripe_account_id!,
      }
    );

    // Get the client secret from the subscription's invoice
    const clientSecret = (subscription.latest_invoice as any).payment_intent.client_secret;

    // Add member to community_members table with the platform fee percentage
    try {
      await sql`
        INSERT INTO community_members (
          community_id,
          user_id,
          joined_at,
          role,
          status,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          platform_fee_percentage
        ) VALUES (
          ${community.id},
          ${userId},
          NOW(),
          'member',
          'pending',
          'incomplete',
          ${customer.id},
          ${subscription.id},
          ${feePercentage}
        )
      `;
    } catch (memberError) {
      console.error("Error adding member:", memberError);
      // Cancel the subscription if member creation fails
      try {
        await stripe.subscriptions.cancel(
          subscription.id,
          {
            stripeAccount: community.stripe_account_id!,
          }
        );
      } catch (cancelError) {
        console.error("Error canceling subscription:", cancelError);
      }
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret,
      stripeAccountId: community.stripe_account_id,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
