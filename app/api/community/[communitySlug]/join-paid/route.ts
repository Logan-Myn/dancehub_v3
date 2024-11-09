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

    // Create or get a price for the subscription
    let priceId = communityData.stripePriceId;
    if (!priceId) {
      const price = await stripe.prices.create({
        unit_amount: membershipPrice * 100,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: `${communityData.name} Membership`,
        },
      });
      priceId = price.id;

      // Save the price ID to the community document
      await communityDoc.ref.update({ stripePriceId: priceId });
    }

    // Create a customer first
    const customer = await stripe.customers.create({
      email: email
    });

    // Create a subscription with customer instead of email
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        userId,
        communityId: communityDoc.id,
      },
      transfer_data: {
        destination: stripeAccountId,
      },
      application_fee_percent: 10, // 10% platform fee
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as any;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: invoice.payment_intent.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 