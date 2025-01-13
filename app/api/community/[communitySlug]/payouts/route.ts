import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

const supabase = createAdminClient();

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community data to fetch stripe_account_id
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("stripe_account_id")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (!community.stripe_account_id) {
      return NextResponse.json({ 
        error: "Stripe account not connected",
        payouts: [],
        balance: null,
      }, { status: 400 });
    }

    // Fetch upcoming payout (balance)
    const balance = await stripe.balance.retrieve({
      stripeAccount: community.stripe_account_id,
    });

    // Fetch recent payouts
    const payouts = await stripe.payouts.list(
      {
        limit: 10,
        expand: ['data.destination'],
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    return NextResponse.json({
      balance: {
        available: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        currency: balance.available[0]?.currency || 'eur',
      },
      payouts: payouts.data.map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        status: payout.status,
        type: payout.type,
        bankAccount: payout.destination,
      })),
    });
  } catch (error) {
    console.error("Error fetching payout data:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout data" },
      { status: 500 }
    );
  }
} 