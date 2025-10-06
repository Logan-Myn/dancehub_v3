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
    const { userId, setupIntentId } = await request.json();

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, membership_price, stripe_account_id, stripe_price_id, opening_date")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Retrieve the SetupIntent to get the payment method and metadata
    const setupIntent = await stripe.setupIntents.retrieve(
      setupIntentId,
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: "Payment method setup incomplete" },
        { status: 400 }
      );
    }

    const paymentMethodId = setupIntent.payment_method as string;
    const customerId = setupIntent.metadata?.stripe_customer_id;
    const platformFeePercentage = parseFloat(setupIntent.metadata?.platform_fee_percentage || '0');

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID not found in setup intent" },
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

    // Create a subscription that starts on the opening date
    // Convert opening_date to Unix timestamp
    const openingTimestamp = Math.floor(new Date(community.opening_date).getTime() / 1000);

    // Create subscription with billing_cycle_anchor set to opening date
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [
          {
            price: community.stripe_price_id,
          },
        ],
        default_payment_method: paymentMethodId,
        billing_cycle_anchor: openingTimestamp,
        proration_behavior: 'none',
        payment_behavior: 'default_incomplete', // Don't charge immediately
        metadata: {
          user_id: userId,
          community_id: community.id,
          platform_fee_percentage: platformFeePercentage.toString(),
          is_pre_registration: 'true',
        },
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Create member record now that payment method is saved
    const { error: memberError } = await supabase
      .from("community_members")
      .insert({
        community_id: community.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        pre_registration_date: new Date().toISOString(),
        role: "member",
        status: "pre_registered",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        platform_fee_percentage: platformFeePercentage,
        pre_registration_payment_method_id: paymentMethodId,
      });

    if (memberError) {
      console.error("Error creating member record:", memberError);

      // Try to cancel the subscription if member creation fails
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
        { error: "Failed to confirm pre-registration" },
        { status: 500 }
      );
    }

    // TODO: Send pre-registration confirmation email

    return NextResponse.json({
      success: true,
      openingDate: community.opening_date,
    });
  } catch (error) {
    console.error("Error confirming pre-registration:", error);
    return NextResponse.json(
      { error: "Failed to confirm pre-registration" },
      { status: 500 }
    );
  }
}
