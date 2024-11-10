import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();
    const { communitySlug } = params;

    // Get community data
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
    const communityId = communityDoc.id;

    // Check membership record
    const membershipDoc = await adminDb
      .collection('memberships')
      .doc(`${communityId}_${userId}`)
      .get();

    if (!membershipDoc.exists) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'No subscription found' 
      });
    }

    const membershipData = membershipDoc.data();

    // If subscription is active, add user to community if not already a member
    if (membershipData?.status === 'active') {
      await adminDb
        .collection('communities')
        .doc(communityId)
        .update({
          members: FieldValue.arrayUnion(userId),
          updatedAt: new Date().toISOString(),
        });

      return NextResponse.json({
        hasSubscription: true,
        status: 'active',
        message: 'Subscription is active and user added to community',
        startDate: membershipData.startDate,
        currentPeriodEnd: membershipData.currentPeriodEnd,
      });
    }

    return NextResponse.json({
      hasSubscription: false,
      status: membershipData?.status,
      message: 'Subscription is not active',
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
} 