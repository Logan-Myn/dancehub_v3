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

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, membership_price, stripe_account_id, stripe_price_id, active_member_count, created_at, promotional_fee_percentage, status, opening_date")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Verify community is in pre-registration status
    if (community.status !== 'pre_registration') {
      return NextResponse.json(
        { error: "Community is not accepting pre-registrations" },
        { status: 400 }
      );
    }

    if (!community.opening_date) {
      return NextResponse.json(
        { error: "Community opening date not set" },
        { status: 400 }
      );
    }

    if (!community.stripe_price_id) {
      return NextResponse.json(
        { error: "Community membership price not configured" },
        { status: 400 }
      );
    }

    // Check if opening date is in the past
    if (new Date(community.opening_date) <= new Date()) {
      return NextResponse.json(
        { error: "Community opening date has passed" },
        { status: 400 }
      );
    }

    // Check if user is already a member or pre-registered
    const { data: existingMember } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member or pre-registered" },
        { status: 400 }
      );
    }

    // Calculate platform fee percentage (same logic as regular join)
    const communityAge = Date.now() - new Date(community.created_at).getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isPromotional = communityAge < thirtyDaysInMs;

    let feePercentage = 0;

    if (!isPromotional) {
      if (community.active_member_count <= 50) {
        feePercentage = 8.0;
      } else if (community.active_member_count <= 100) {
        feePercentage = 6.0;
      } else {
        feePercentage = 4.0;
      }
    }

    // Create Stripe customer on connected account
    const customer = await stripe.customers.create(
      {
        email,
        metadata: {
          user_id: userId,
          community_id: community.id,
          is_pre_registration: 'true'
        },
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Create SetupIntent to save payment method without charging
    const setupIntent = await stripe.setupIntents.create(
      {
        customer: customer.id,
        payment_method_types: ['card'],
        metadata: {
          user_id: userId,
          community_id: community.id,
          platform_fee_percentage: feePercentage.toString(),
          opening_date: community.opening_date,
        },
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Add member to community_members with pre_registration status
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        pre_registration_date: new Date().toISOString(),
        role: "member",
        status: "pending_pre_registration",
        stripe_customer_id: customer.id,
        platform_fee_percentage: feePercentage,
      });

    if (memberError) {
      console.error("Error adding pre-registered member:", memberError);
      // Cancel the setup intent if member creation fails
      try {
        await stripe.setupIntents.cancel(
          setupIntent.id,
          {
            stripeAccount: community.stripe_account_id,
          }
        );
      } catch (cancelError) {
        console.error("Error canceling setup intent:", cancelError);
      }
      return NextResponse.json(
        { error: "Failed to pre-register" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      stripeAccountId: community.stripe_account_id,
      setupIntentId: setupIntent.id,
      openingDate: community.opening_date,
    });
  } catch (error) {
    console.error("Error creating pre-registration:", error);
    return NextResponse.json(
      { error: "Failed to create pre-registration" },
      { status: 500 }
    );
  }
}
