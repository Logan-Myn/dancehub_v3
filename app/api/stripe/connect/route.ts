import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { communityId, userId } = await request.json();

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

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/community/${communityId}/settings?tab=subscriptions`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/community/${communityId}/settings?tab=subscriptions&setup=complete`,
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