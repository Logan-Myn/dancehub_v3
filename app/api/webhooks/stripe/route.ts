import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';

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

    switch (event.type) {
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const { userId, communityId } = subscription.metadata;

          // Add user to community members if not already a member
          await adminDb
            .collection('communities')
            .doc(communityId)
            .update({
              members: FieldValue.arrayUnion(userId),
              updatedAt: new Date().toISOString(),
            });

          // Update or create membership record
          await adminDb.collection('memberships').doc(`${communityId}_${userId}`).set({
            userId,
            communityId,
            subscriptionId: subscription.id,
            status: 'active',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        const { userId: deletedUserId, communityId: deletedCommunityId } = deletedSubscription.metadata;

        // Remove user from community members
        await adminDb
          .collection('communities')
          .doc(deletedCommunityId)
          .update({
            members: FieldValue.arrayRemove(deletedUserId),
            updatedAt: new Date().toISOString(),
          });

        // Update membership status
        await adminDb.collection('memberships').doc(`${deletedCommunityId}_${deletedUserId}`).update({
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        });
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