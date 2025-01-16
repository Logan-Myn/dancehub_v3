import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;
const supabase = createAdminClient();

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // For Connect account events, create a new Stripe instance with the account
    const connectedStripe = event.account ? 
      new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-10-28.acacia',
        stripeAccount: event.account
      }) : 
      stripe;

    const { stripe_account_id } = (event.data.object as any).metadata || {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Validate metadata exists
        if (!paymentIntent.metadata?.user_id || !paymentIntent.metadata?.community_id) {
          console.error('Missing metadata in payment intent:', {
            id: paymentIntent.id,
            metadata: paymentIntent.metadata,
            accountId: event.account
          });
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        const { user_id, community_id } = paymentIntent.metadata;

        // First check if member already exists
        const { data: existingMember } = await supabase
          .from('community_members')
          .select('id, status')
          .eq('community_id', community_id)
          .eq('user_id', user_id)
          .single();

        if (existingMember) {
          // Update existing member
          const { error: updateError } = await supabase
            .from('community_members')
            .update({
              status: 'active',
              payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMember.id);

          if (updateError) {
            console.error('Error updating member status:', updateError);
            return NextResponse.json(
              { error: 'Failed to update member status' },
              { status: 500 }
            );
          }
        } else {
          // Add new member
          const { error: memberError } = await supabase
            .from('community_members')
            .insert({
              community_id,
              user_id,
              status: 'active',
              joined_at: new Date().toISOString(),
              payment_intent_id: paymentIntent.id
            });

          if (memberError) {
            console.error('Error adding member:', memberError);
            return NextResponse.json(
              { error: 'Failed to add member' },
              { status: 500 }
            );
          }
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

          // Update member status and subscription details
          const { error: memberUpdateError } = await supabase
            .from('community_members')
            .update({
              status: 'active',
              subscription_status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              last_payment_date: new Date().toISOString()
            })
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id);

          if (memberUpdateError) {
            console.error('Error updating member status:', memberUpdateError);
            return NextResponse.json(
              { error: 'Failed to update member status' },
              { status: 500 }
            );
          }

          // Update members_count in communities table if this is the first payment
          const { data: member } = await supabase
            .from('community_members')
            .select('status')
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id)
            .single();

          if (member && member.status === 'pending') {
            const { error: countError } = await supabase.rpc(
              'increment_members_count',
              { community_id: subscription.metadata.community_id }
            );

            if (countError) {
              console.error('Error updating members count:', countError);
              return NextResponse.json(
                { error: 'Failed to update members count' },
                { status: 500 }
              );
            }
          }
        }
        break;

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
          console.error('Missing metadata in subscription:', subscription.id);
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        // Update member subscription status
        const { error: statusUpdateError } = await supabase
          .from('community_members')
          .update({
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('community_id', subscription.metadata.community_id)
          .eq('user_id', subscription.metadata.user_id);

        if (statusUpdateError) {
          console.error('Error updating subscription status:', statusUpdateError);
          return NextResponse.json(
            { error: 'Failed to update subscription status' },
            { status: 500 }
          );
        }

        // If subscription is canceled or expired, update member status and decrement count
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          const { error: memberStatusError } = await supabase
            .from('community_members')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id);

          if (memberStatusError) {
            console.error('Error updating member status:', memberStatusError);
            return NextResponse.json(
              { error: 'Failed to update member status' },
              { status: 500 }
            );
          }

          const { error: countError } = await supabase.rpc(
            'decrement_members_count',
            { community_id: subscription.metadata.community_id }
          );

          if (countError) {
            console.error('Error updating members count:', countError);
            return NextResponse.json(
              { error: 'Failed to update members count' },
              { status: 500 }
            );
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            failedInvoice.subscription as string,
            {
              stripeAccount: stripe_account_id,
            }
          );

          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          // Update member subscription status to reflect payment failure
          const { error: failureUpdateError } = await supabase
            .from('community_members')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('community_id', subscription.metadata.community_id)
            .eq('user_id', subscription.metadata.user_id);

          if (failureUpdateError) {
            console.error('Error updating subscription status:', failureUpdateError);
            return NextResponse.json(
              { error: 'Failed to update subscription status' },
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