import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { communitySlug } = params;
    const { price, enabled } = await request.json();

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

    // Update the community with the new price settings
    await adminDb
      .collection('communities')
      .doc(communityDoc.id)
      .update({
        membershipEnabled: enabled,
        membershipPrice: enabled ? price : null,
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    );
  }
} 