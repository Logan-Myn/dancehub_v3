import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();

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

    const communityRef = communitySnapshot.docs[0].ref;

    // Start a batch write
    const batch = adminDb.batch();

    // Add to members subcollection
    const memberRef = communityRef.collection("members").doc(userId);
    batch.set(memberRef, {
      userId,
      joinedAt: Timestamp.now(),
      role: "member",
      status: "active"
    });

    // Also add to members array for backward compatibility
    batch.update(communityRef, {
      members: FieldValue.arrayUnion(userId),
      membersCount: FieldValue.increment(1)
    });

    // Commit the batch
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining community:", error);
    return NextResponse.json(
      { error: "Failed to join community" },
      { status: 500 }
    );
  }
}
