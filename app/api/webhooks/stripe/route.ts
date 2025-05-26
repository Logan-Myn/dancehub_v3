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
    console.log('🎯 Webhook endpoint hit');
    const body = await request.text();
    const signature = headers().get('stripe-signature')!;
    console.log('📝 Got signature:', signature ? 'Yes' : 'No');

    let event: Stripe.Event;

    try {
      // Check if it's a Connect webhook event
      const isConnectEvent = body.includes('"account":');
      const secret = isConnectEvent ? connectWebhookSecret : webhookSecret;
      console.log('Using webhook secret for:', isConnectEvent ? 'Connect' : 'Platform');
      
      event = stripe.webhooks.constructEvent(body, signature, secret);
      console.log('✅ Webhook verified, event type:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received webhook event:', event.type);

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
        console.log('💳 Payment intent succeeded');
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💳 Full payment intent:', JSON.stringify(paymentIntent, null, 2));
        console.log('💳 Metadata:', paymentIntent.metadata);
        console.log('💳 Is Connect event:', !!event.account);

        // For Connect events, metadata is on the subscription
        if (event.account && paymentIntent.invoice) {
          console.log('🔍 Getting subscription details for invoice:', paymentIntent.invoice);
          const invoice = await connectedStripe.invoices.retrieve(paymentIntent.invoice as string);
          const subscription = await connectedStripe.subscriptions.retrieve(invoice.subscription as string);
          
          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const { user_id, community_id } = subscription.metadata;
          console.log('🔍 Found metadata from subscription:', { user_id, community_id });

          try {
            // Update member status to active
            const { error: statusUpdateError } = await supabase
              .from('community_members')
              .update({ status: 'active' })
              .eq('community_id', community_id)
              .eq('user_id', user_id);

            if (statusUpdateError) {
              console.error('❌ Error updating member status:', statusUpdateError);
              throw statusUpdateError;
            }

            console.log('✅ Successfully updated member status to active');
            return NextResponse.json({ received: true });
          } catch (error) {
            console.error('❌ Error in payment_intent.succeeded handler:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
          }
        }

        // For direct payments, metadata is on the payment intent
        if (!event.account && (!paymentIntent.metadata?.user_id || !paymentIntent.metadata?.community_id)) {
          console.error('Missing metadata in payment intent:', {
            id: paymentIntent.id,
            metadata: paymentIntent.metadata
          });
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        break;

      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        console.log('📄 Full invoice:', JSON.stringify(invoice, null, 2));

        if (!invoice.subscription) {
          console.log('⚠️ No subscription associated with invoice');
          return NextResponse.json({ received: true });
        }

        try {
          // Get subscription from the connected account
          const subscription = await connectedStripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          if (!subscription.metadata?.user_id || !subscription.metadata?.community_id) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const { user_id, community_id } = subscription.metadata;
          console.log('🔍 Processing invoice payment for:', { user_id, community_id });

          // Check if this member should transition from promotional to standard pricing
          const { data: community } = await supabase
            .from('communities')
            .select('created_at, active_member_count')
            .eq('id', community_id)
            .single();

          if (community) {
            const communityAge = Date.now() - new Date(community.created_at).getTime();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const isStillPromotional = communityAge < thirtyDaysInMs;

            let newFeePercentage = 0;
            if (!isStillPromotional) {
              // Calculate standard tiered pricing
              if (community.active_member_count <= 50) {
                newFeePercentage = 8.0;
              } else if (community.active_member_count <= 100) {
                newFeePercentage = 6.0;
              } else {
                newFeePercentage = 4.0;
              }

              // Update the subscription's application fee if it has changed
              if (subscription.application_fee_percent !== newFeePercentage) {
                console.log(`🔄 Updating subscription ${subscription.id} fee from ${subscription.application_fee_percent}% to ${newFeePercentage}%`);
                
                await connectedStripe.subscriptions.update(subscription.id, {
                  application_fee_percent: newFeePercentage,
                  metadata: {
                    ...subscription.metadata,
                    fee_updated_at: new Date().toISOString(),
                    previous_fee: subscription.application_fee_percent?.toString() || '0'
                  }
                });
              }
            }

            // Update member status and platform fee percentage
            const { error: updateError } = await supabase
              .from('community_members')
              .update({ 
                status: 'active',
                subscription_status: subscription.status,
                platform_fee_percentage: isStillPromotional ? 0 : newFeePercentage,
                updated_at: new Date().toISOString()
              })
              .eq('community_id', community_id)
              .eq('user_id', user_id);

            if (updateError) {
              console.error('❌ Error updating member status:', updateError);
              throw updateError;
            }
          }

          console.log('✅ Successfully updated member status');
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error('❌ Error in invoice.payment_succeeded handler:', error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

      case 'customer.subscription.updated':
        console.log('📝 Subscription updated');
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log('📝 Full subscription:', JSON.stringify(updatedSubscription, null, 2));

        if (!updatedSubscription.metadata?.user_id || !updatedSubscription.metadata?.community_id) {
          console.error('Missing metadata in subscription:', updatedSubscription.id);
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        try {
          const { user_id, community_id } = updatedSubscription.metadata;
          console.log('🔍 Processing subscription update for:', { user_id, community_id });

          // Update subscription status in community_members
          const { error: updateError } = await supabase
            .from('community_members')
            .update({ 
              subscription_status: updatedSubscription.status,
              updated_at: new Date().toISOString()
            })
            .eq('community_id', community_id)
            .eq('user_id', user_id);

          if (updateError) {
            console.error('❌ Error updating subscription status:', updateError);
            throw updateError;
          }

          console.log('✅ Successfully updated subscription status');
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error('❌ Error in subscription.updated handler:', error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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