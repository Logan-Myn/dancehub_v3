import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { price, enabled } = await request.json();
    const { communitySlug } = params;

    // Get community by slug with stripe details
    const { data: community, error: communityError } = await supabaseAdmin
      .from('communities')
      .select('id, name, stripe_account_id, stripe_product_id')
      .eq('slug', communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    if (!community.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe account not connected' },
        { status: 400 }
      );
    }

    // If membership is enabled and there's a price, create or update Stripe price
    let stripe_price_id = null;
    if (enabled && price > 0) {
      // First, create a product for the community if it doesn't exist
      let product_id = community.stripe_product_id;
      
      if (!product_id) {
        const product = await stripe.products.create({
          name: `${community.name} Membership`,
          description: `Monthly membership for ${community.name}`,
        }, {
          stripeAccount: community.stripe_account_id,
        });
        product_id = product.id;
      }

      // Create a new price in Stripe
      const stripePrice = await stripe.prices.create({
        product: product_id,
        unit_amount: price * 100, // Convert to cents
        currency: 'eur',
        recurring: { interval: 'month' },
      }, {
        stripeAccount: community.stripe_account_id,
      });
      
      stripe_price_id = stripePrice.id;

      // Update community with both product and price IDs
      const { error: updateError } = await supabaseAdmin
        .from('communities')
        .update({
          membership_enabled: enabled,
          membership_price: price,
          stripe_product_id: product_id,
          stripe_price_id: stripe_price_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', community.id);

      if (updateError) {
        console.error('Error updating community:', updateError);
        return NextResponse.json(
          { error: 'Failed to update community' },
          { status: 500 }
        );
      }
    } else {
      // If disabling membership or price is 0, just update the membership status
      const { error: updateError } = await supabaseAdmin
        .from('communities')
        .update({
          membership_enabled: enabled,
          membership_price: enabled ? price : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', community.id);

      if (updateError) {
        console.error('Error updating community:', updateError);
        return NextResponse.json(
          { error: 'Failed to update community' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true,
      stripe_price_id,
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    );
  }
} 