import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId, email } = await request.json();
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
    const communityData = communityDoc.data();
    const { stripeAccountId, membershipPrice } = communityData;

    if (!stripeAccountId || !membershipPrice) {
      return NextResponse.json(
        { error: 'Community is not set up for payments' },
        { status: 400 }
      );
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: membershipPrice * 100, // Convert to cents
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId,
        communityId: communityDoc.id,
      },
      application_fee_amount: 500, // 5€ platform fee
      transfer_data: {
        destination: stripeAccountId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
} 