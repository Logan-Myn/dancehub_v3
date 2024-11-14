import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community data
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const community = communitySnapshot.docs[0].data();
    const communityId = communitySnapshot.docs[0].id;

    // Get total members from members subcollection
    const totalMembersSnapshot = await adminDb
      .collection("communities")
      .doc(communityId)
      .collection("members")
      .count()
      .get();

    const totalMembers = totalMembersSnapshot.data().count;

    // Get total threads
    const threadsSnapshot = await adminDb
      .collection("communities")
      .doc(communityId)
      .collection("threads")
      .count()
      .get();

    // Get active members (members who have posted or commented in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeMembers = new Set();
    const recentActivitySnapshot = await adminDb
      .collection("communities")
      .doc(communityId)
      .collection("threads")
      .where("createdAt", ">=", thirtyDaysAgo)
      .get();

    recentActivitySnapshot.docs.forEach(doc => {
      activeMembers.add(doc.data().userId);
    });

    // Get monthly revenue if Stripe is connected
    let monthlyRevenue = 0;
    if (community.stripeAccountId) {
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        expand: ['data.default_payment_method'],
      });
      
      monthlyRevenue = subscriptions.data.reduce((total, sub) => {
        return total + (sub.items.data[0].price.unit_amount || 0) / 100;
      }, 0);
    }

    // Calculate membership growth
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const newMembersThisMonth = await adminDb
      .collection("communities")
      .doc(communityId)
      .collection("members")
      .where("joinedAt", ">=", oneMonthAgo)
      .count()
      .get();

    // Calculate growth percentage
    const membershipGrowth = totalMembers > 0 
      ? ((newMembersThisMonth.data().count / totalMembers) * 100).toFixed(1)
      : "0.0";

    return NextResponse.json({
      totalMembers,
      monthlyRevenue,
      totalThreads: threadsSnapshot.data().count,
      activeMembers: activeMembers.size,
      membershipGrowth,
    });
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
} 