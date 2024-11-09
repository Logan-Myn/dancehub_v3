import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();
    const { communitySlug } = params;

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
    const currentMembers = communityDoc.data().members || [];

    // Remove the user from members array
    const updatedMembers = currentMembers.filter((memberId: string) => memberId !== userId);

    // Update the community document
    await adminDb
      .collection('communities')
      .doc(communityDoc.id)
      .update({
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving community:', error);
    return NextResponse.json(
      { error: 'Failed to leave community' },
      { status: 500 }
    );
  }
} 