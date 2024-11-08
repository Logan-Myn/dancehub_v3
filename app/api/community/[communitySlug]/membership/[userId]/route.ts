import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; userId: string } }
) {
  try {
    const { communitySlug, userId } = params;

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
    const isMember = communityData?.members?.includes(userId) || false;

    return NextResponse.json({ isMember });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json(
      { error: 'Failed to check membership' },
      { status: 500 }
    );
  }
} 