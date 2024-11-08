import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId, communityId, email } = await request.json();

    // Create a customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
        communityId,
      },
    });

    // Create a SetupIntent to save the payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        communityId,
      },
    });

    // Create the subscription with trial period
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 14,
      payment_settings: { 
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        communityId,
      },
    });

    // Store subscription info in Firestore
    await adminDb.collection('subscriptions').doc(communityId).set({
      userId,
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
      currentPeriodEnd: subscription.current_period_end,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 