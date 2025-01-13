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
      .select("id, membership_price, stripe_account_id, stripe_price_id")
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

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: (community.membership_price || 0) * 100,
        currency: "eur",
        metadata: {
          community_id: community.id,
          user_id: userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Add member to community_members table
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        role: "member",
        status: "active",
        subscription_status: "active",
        payment_intent_id: paymentIntent.id
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      // Attempt to cancel the payment intent if member creation fails
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error("Error canceling payment intent:", cancelError);
      }
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    // Update members_count in communities table
    const { error: updateError } = await supabase.rpc(
      'increment_members_count',
      { community_id: community.id }
    );

    if (updateError) {
      console.error("Error updating members count:", updateError);
      // Rollback the member addition and cancel payment intent
      await supabase
        .from("community_members")
        .delete()
        .eq("community_id", community.id)
        .eq("user_id", userId);
      
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelError) {
        console.error("Error canceling payment intent:", cancelError);
      }

      return NextResponse.json(
        { error: "Failed to update members count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      stripeAccountId: community.stripe_account_id
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
} 