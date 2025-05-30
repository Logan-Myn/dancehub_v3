import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  
  try {
    const { communityId } = await request.json();

    // Create a Stripe Connect account with worldwide support
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual'
          }
        }
      },
      business_type: 'individual'
    });

    // Update the community with the Stripe account ID
    const { error } = await supabase
      .from('communities')
      .update({ stripe_account_id: account.id })
      .eq('id', communityId);

    if (error) throw error;

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/community/onboarding`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/community/onboarding`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
} 