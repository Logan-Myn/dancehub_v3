import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { communitySlug: string; userId: string } }
) {
  try {
    const { communitySlug, userId } = params;

    // Get community by slug
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
    const members = communityDoc.data().members || [];

    return NextResponse.json({
      isMember: members.includes(userId),
    });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json(
      { error: 'Failed to check membership' },
      { status: 500 }
    );
  }
} 