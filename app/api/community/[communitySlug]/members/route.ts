import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// Helper function to format display name
function formatDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return 'Anonymous User';
  
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length === 1) return nameParts[0];
  
  const firstName = nameParts[0];
  const lastInitial = nameParts[nameParts.length - 1][0];
  return `${firstName} ${lastInitial}.`;
}

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;

    // First get the community by slug
    const communitiesSnapshot = await adminDb
      .collection('communities')
      .where('slug', '==', communitySlug)
      .limit(1)
      .get();

    if (communitiesSnapshot.empty) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const communityDoc = communitiesSnapshot.docs[0];
    const communityData = communityDoc.data();
    const memberIds = communityData?.members || [];

    // Fetch user profiles from Firebase Auth
    const members = await Promise.all(
      memberIds.map(async (uid: string) => {
        try {
          const userRecord = await adminAuth.getUser(uid);
          return {
            id: uid,
            imageUrl: userRecord.photoURL || '/placeholder-avatar.png',
            displayName: formatDisplayName(userRecord.displayName),
          };
        } catch (error) {
          console.error(`Error fetching user ${uid}:`, error);
          return {
            id: uid,
            imageUrl: '/placeholder-avatar.png',
            displayName: 'Anonymous User',
          };
        }
      })
    );

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
} 