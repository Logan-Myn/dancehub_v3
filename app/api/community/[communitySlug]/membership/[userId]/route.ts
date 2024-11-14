import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; userId: string } }
) {
  try {
    // Get community reference
    const communitySnapshot = await adminDb
      .collection("communities")
      .where("slug", "==", params.communitySlug)
      .limit(1)
      .get();

    if (communitySnapshot.empty) {
      return NextResponse.json({ isMember: false });
    }

    const communityRef = communitySnapshot.docs[0].ref;

    // Check if user is a member in the new structure
    const memberDoc = await communityRef
      .collection("members")
      .doc(params.userId)
      .get();

    const isMember = memberDoc.exists;

    return NextResponse.json({ isMember });
  } catch (error) {
    console.error("Error checking membership:", error);
    return NextResponse.json({ isMember: false });
  }
} 