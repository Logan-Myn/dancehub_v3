import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const { stripe_account_id } = (event.data.object as any).metadata || {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Validate metadata exists
        if (!paymentIntent.metadata?.user_id || !paymentIntent.metadata?.community_id) {
          console.error('Missing metadata in payment intent:', paymentIntent.id);
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        const { user_id, community_id } = paymentIntent.metadata;

        // Add user to community_members table
        const { error: memberError } = await supabase
          .from('community_members')
          .insert({
            community_id,
            user_id,
            status: 'active',
            joined_at: new Date().toISOString(),
          });

        if (memberError) {
          console.error('Error adding member:', memberError);
          return NextResponse.json(
            { error: 'Failed to add member' },
            { status: 500 }
          );
        }

        // Create membership record
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert({
            id: `${community_id}_${user_id}`,
            user_id,
            community_id,
            status: 'active',
            start_date: new Date().toISOString(),
            payment_intent_id: paymentIntent.id,
            subscription_id: paymentIntent.metadata.subscription_id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          });

        if (membershipError) {
          console.error('Error creating membership:', membershipError);
          // Rollback member addition
          await supabase
            .from('community_members')
            .delete()
            .eq('community_id', community_id)
            .eq('user_id', user_id);

          return NextResponse.json(
            { error: 'Failed to create membership' },
            { status: 500 }
          );
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          // Get subscription from the connected account
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
            {
              stripeAccount: stripe_account_id,
            }
          );

          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const { error: updateError } = await supabase
            .from('memberships')
            .update({
              status: 'active',
              last_payment_date: new Date().toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', `${subscription.metadata.community_id}_${subscription.metadata.user_id}`);

          if (updateError) {
            console.error('Error updating membership:', updateError);
            return NextResponse.json(
              { error: 'Failed to update membership' },
              { status: 500 }
            );
          }
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 