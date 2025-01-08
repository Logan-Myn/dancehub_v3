import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // Get community data to fetch stripeAccountId
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const communityData = communitySnapshot.docs[0].data();
    const stripeAccountId = communityData.stripeAccountId;

    if (!stripeAccountId) {
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
        stripeAccount: stripeAccountId,
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