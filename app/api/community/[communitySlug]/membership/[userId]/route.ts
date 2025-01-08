import { NextResponse } from 'next/server';
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; userId: string } }
) {
  try {
    const { communitySlug, userId } = params;

    // Get community doc to check if user is creator
    const communityDoc = await adminDb
      .collection("communities")
      .where("slug", "==", communitySlug)
      .limit(1)
      .get();

    if (communityDoc.empty) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const community = communityDoc.docs[0].data();
    
    // Check if user is creator
    if (community.createdBy === userId) {
      return NextResponse.json({ isMember: true });
    }

    // Check membership collection
    const membershipDoc = await adminDb
      .collection("communities")
      .doc(communityDoc.docs[0].id)
      .collection("members")
      .doc(userId)
      .get();

    return NextResponse.json({ isMember: membershipDoc.exists });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 