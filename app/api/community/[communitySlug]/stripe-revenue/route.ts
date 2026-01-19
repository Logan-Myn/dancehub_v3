import { NextResponse } from "next/server";
import Stripe from "stripe";
import { queryOne } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

interface CommunityStripeAccount {
  stripe_account_id: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community data to fetch stripe_account_id
    const community = await queryOne<CommunityStripeAccount>`
      SELECT stripe_account_id
      FROM communities
      WHERE slug = ${communitySlug}
    `;

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    if (!community.stripe_account_id) {
      return NextResponse.json({ monthlyRevenue: 0 });
    }

    // Check if the Stripe account is fully enabled before fetching data
    try {
      const account = await stripe.accounts.retrieve(community.stripe_account_id);
      if (!account.charges_enabled) {
        // Account exists but isn't fully onboarded - return 0 instead of error
        return NextResponse.json({ monthlyRevenue: 0 });
      }
    } catch (accountError) {
      console.error("Error checking Stripe account status:", accountError);
      // If we can't verify the account, return 0 rather than fail
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
