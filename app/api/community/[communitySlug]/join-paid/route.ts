import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId, email } = await request.json();

    // Get community with its membership price and stripe account
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, membership_price, stripe_account_id, stripe_price_id, active_member_count")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
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

    // Calculate platform fee percentage based on active member count
    const { data: feePercentage } = await supabase
      .rpc('calculate_platform_fee_percentage', {
        member_count: community.active_member_count
      });

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single();

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
        stripeAccount: community.stripe_account_id,
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
        stripeAccount: community.stripe_account_id,
      }
    );

    // Get the client secret from the subscription's invoice
    const clientSecret = (subscription.latest_invoice as any).payment_intent.client_secret;

    // Add member to community_members table with the platform fee percentage
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        role: "member",
        status: "pending", // Will be updated to active when payment succeeds
        subscription_status: "incomplete",
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        platform_fee_percentage: feePercentage
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      // Cancel the subscription if member creation fails
      try {
        await stripe.subscriptions.cancel(
          subscription.id,
          {
            stripeAccount: community.stripe_account_id,
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