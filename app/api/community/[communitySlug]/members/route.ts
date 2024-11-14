import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

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
      return NextResponse.json({ members: [] });
    }

    const communityRef = communitySnapshot.docs[0].ref;
    const communityData = communitySnapshot.docs[0].data();

    // Get members from both the subcollection and the members array
    const membersSnapshot = await communityRef
      .collection("members")
      .get();

    // Combine member IDs from both sources
    const memberIds = new Set([
      ...membersSnapshot.docs.map(doc => doc.data().userId),
      ...(communityData.members || [])
    ]);

    // Fetch user details from Firebase Auth
    const members = await Promise.all(
      Array.from(memberIds).map(async (userId) => {
        try {
          const user = await adminAuth.getUser(userId);
          return {
            id: userId,
            displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
            imageUrl: user.photoURL || '',
            email: user.email,
            provider: user.providerData[0]?.providerId || 'unknown'
          };
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return null;
        }
      })
    );

    // Filter out any null results
    const validMembers = members.filter(member => member !== null);

    return NextResponse.json(validMembers);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
