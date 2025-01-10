import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Store subscription info in Supabase
    const { error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        id: communityId, // Using communityId as the subscription id for consistency
        user_id: userId,
        customer_id: customer.id,
        subscription_id: subscription.id,
        status: subscription.status,
        trial_end: new Date(subscription.trial_end! * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

    if (subscriptionError) {
      console.error('Error storing subscription:', subscriptionError);
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