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
    const { stripeAccountId, stripePriceId, membershipPrice } = communityData;

    if (!stripeAccountId || !stripePriceId) {
      return NextResponse.json(
        { error: 'Community is not set up for payments' },
        { status: 400 }
      );
    }

    // Create a customer on the connected account
    const customer = await stripe.customers.create(
      {
        email,
        metadata: {
          userId,
          communityId: communityDoc.id,
        },
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    // Create a subscription with the stored price ID
    const subscription = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { 
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card'],
        },
        metadata: {
          userId,
          communityId: communityDoc.id,
        },
        expand: ['latest_invoice.payment_intent'],
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice.payment_intent.client_secret;

    if (!clientSecret) {
      throw new Error('No client secret received from Stripe');
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 