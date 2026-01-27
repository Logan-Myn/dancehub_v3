import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId, communityId, email } = await request.json();

    // Create a customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        user_id: userId,
        community_id: communityId,
      },
    });

    // Create a SetupIntent to save the payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: {
        community_id: communityId,
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
        community_id: communityId,
      },
    });

    // In Clover API, current_period_end is now on subscription items, not the subscription itself
    // Use type assertion since SDK types may not reflect latest API version
    const subscriptionItem = subscription.items.data[0] as any;
    const currentPeriodEnd = subscriptionItem?.current_period_end;

    // Store subscription info in database
    const result = await sql`
      INSERT INTO subscriptions (
        id,
        user_id,
        customer_id,
        subscription_id,
        status,
        trial_end,
        current_period_end,
        created_at
      ) VALUES (
        ${communityId},
        ${userId},
        ${customer.id},
        ${subscription.id},
        ${subscription.status},
        ${new Date(subscription.trial_end! * 1000).toISOString()},
        ${currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null},
        NOW()
      )
    `;

    if (!result) {
      console.error('Error storing subscription');
      // Attempt to cancel the subscription if database storage fails
      try {
        await stripe.subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        console.error('Error canceling subscription:', cancelError);
      }
      return NextResponse.json(
        { error: 'Failed to store subscription' },
        { status: 500 }
      );
    }

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
