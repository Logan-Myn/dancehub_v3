import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId, email } = await request.json();

    // Get community reference
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    const communityDoc = communitySnapshot.docs[0];
    const community = communityDoc.data();
    const communityRef = communityDoc.ref;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: (community.membershipPrice || 0) * 100,
      currency: "eur",
      payment_method_types: ["card"],
      metadata: {
        communityId: communityDoc.id,
        userId: userId,
      },
    });

    // Add member to the members subcollection
    await communityRef.collection("members").doc(userId).set({
      userId,
      joinedAt: Timestamp.now(),
      role: "member",
      status: "active",
      subscriptionStatus: "active",
      paymentIntentId: paymentIntent.id
    });

    // Update community document
    await communityRef.update({
      members: FieldValue.arrayUnion(userId),
      membersCount: FieldValue.increment(1)
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      stripeAccountId: community.stripeAccountId
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
} 