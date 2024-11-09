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
      // Create a new product
      const product = await stripe.products.create({
        name: `${communityData.name} Membership`,
        metadata: {
          description: `Monthly membership for ${communityData.name}`,
        }
      });

      // Create price linked to the product with transfer data
      const stripePrice = await stripe.prices.create({
        unit_amount: price * 100, // Convert to cents
        currency: 'eur',
        recurring: { interval: 'month' },
        product: product.id,
        transfer_lookup_key: communityData.stripeAccountId // Use this instead of transfer_data
      });
      
      stripePriceId = stripePrice.id;
    }

    // Update community document
    await communityDoc.ref.update({
      membershipEnabled: enabled,
      membershipPrice: enabled ? price : null,
      stripePriceId: stripePriceId, // Store the Stripe price ID
      updatedAt: new Date().toISOString(),
    });

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