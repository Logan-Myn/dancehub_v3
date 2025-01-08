import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

    const { stripeAccountId } = (event.data.object as any).metadata || {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Validate metadata exists
        if (!paymentIntent.metadata?.userId || !paymentIntent.metadata?.communityId) {
          console.error('Missing metadata in payment intent:', paymentIntent.id);
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
        }

        const { userId, communityId } = paymentIntent.metadata;

        // Add user to community members
        await adminDb
          .collection('communities')
          .doc(communityId)
          .update({
            members: FieldValue.arrayUnion(userId),
            updatedAt: new Date().toISOString(),
          });

        // Create membership record
        const membershipId = `${communityId}_${userId}`;
        await adminDb
          .collection('memberships')
          .doc(membershipId)
          .set({
            userId,
            communityId,
            status: 'active',
            startDate: new Date().toISOString(),
            paymentIntentId: paymentIntent.id,
            subscriptionId: paymentIntent.metadata.subscriptionId,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          });
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          // Get subscription from the connected account
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
            {
              stripeAccount: stripeAccountId,
            }
          );

          if (!subscription.metadata?.userId || !subscription.metadata?.communityId) {
            console.error('Missing metadata in subscription:', subscription.id);
            return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
          }

          const subMembershipId = `${subscription.metadata.communityId}_${subscription.metadata.userId}`;
          
          await adminDb
            .collection('memberships')
            .doc(subMembershipId)
            .update({
              status: 'active',
              lastPaymentDate: new Date().toISOString(),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
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