import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { communityId, userId } = await request.json();

    // First get the community slug
    const communityDoc = await adminDb
      .collection('communities')
      .doc(communityId)
      .get();

    if (!communityDoc.exists) {
      throw new Error('Community not found');
    }

    const communityData = communityDoc.data();
    const communitySlug = communityData?.slug;

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        communityId,
        userId,
      },
    });

    // Store the Stripe account ID in Firestore
    await adminDb
      .collection('communities')
      .doc(communityId)
      .update({
        stripeAccountId: account.id,
        updatedAt: new Date().toISOString(),
      });

    // Make sure we have the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';

    // Create an account link for onboarding with full URLs using the slug
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/community/${communitySlug}?tab=subscriptions`,
      return_url: `${baseUrl}/community/${communitySlug}?tab=subscriptions&setup=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    );
  }
} 