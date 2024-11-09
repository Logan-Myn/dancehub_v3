import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { price, enabled } = await request.json();
    const { communitySlug } = params;

    // Get community by slug
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

    if (!communityData.stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 400 }
      );
    }

    // If membership is enabled and there's a price, create or update Stripe price
    let stripePriceId = null;
    if (enabled && price > 0) {
      // First, create a product for the community if it doesn't exist
      let productId = communityData.stripeProductId;
      
      if (!productId) {
        const product = await stripe.products.create({
          name: `${communityData.name} Membership`,
          description: `Monthly membership for ${communityData.name}`,
        }, {
          stripeAccount: communityData.stripeAccountId,
        });
        productId = product.id;
      }

      // Create a new price in Stripe
      const stripePrice = await stripe.prices.create({
        product: productId,
        unit_amount: price * 100, // Convert to cents
        currency: 'eur',
        recurring: { interval: 'month' },
      }, {
        stripeAccount: communityData.stripeAccountId,
      });
      
      stripePriceId = stripePrice.id;

      // Update community document with both product and price IDs
      await communityDoc.ref.update({
        membershipEnabled: enabled,
        membershipPrice: price,
        stripeProductId: productId,
        stripePriceId: stripePriceId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // If disabling membership or price is 0, just update the membership status
      await communityDoc.ref.update({
        membershipEnabled: enabled,
        membershipPrice: enabled ? price : null,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ 
      success: true,
      stripePriceId,
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    );
  }
} 