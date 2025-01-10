import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community data to fetch stripe_account_id
    const { data: community, error: communityError } = await supabaseAdmin
      .from("communities")
      .select("stripe_account_id")
      .eq("slug", communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (!community.stripe_account_id) {
      return NextResponse.json({ monthlyRevenue: 0 });
    }

    // Get the first day of the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch payments from Stripe
    const charges = await stripe.charges.list(
      {
        created: {
          gte: Math.floor(startOfMonth.getTime() / 1000),
        },
        limit: 100,
      },
      {
        stripeAccount: community.stripe_account_id,
      }
    );

    // Calculate total revenue
    const monthlyRevenue = charges.data.reduce((total, charge) => {
      if (charge.status === 'succeeded') {
        return total + (charge.amount / 100); // Convert from cents to dollars/euros
      }
      return total;
    }, 0);

    return NextResponse.json({ monthlyRevenue });
  } catch (error) {
    console.error("Error fetching Stripe revenue:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
} 