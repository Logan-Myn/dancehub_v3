import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    // Get community reference
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const communityRef = communitySnapshot.docs[0].ref;

    // Get members count from the members subcollection
    const membersSnapshot = await communityRef
      .collection("members")
      .count()
      .get();

    const totalMembers = membersSnapshot.data().count;

    // Get total threads count
    const threadsSnapshot = await communityRef
      .collection("threads")
      .count()
      .get();

    const totalThreads = threadsSnapshot.data().count;

    // For now, return basic stats
    return NextResponse.json({
      totalMembers,
      monthlyRevenue: 0,
      totalThreads,
      activeMembers: 0,
      membershipGrowth: 0
    });
  } catch (error) {
    console.error("Error fetching community stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
} 