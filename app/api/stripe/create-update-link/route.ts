import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { accountId, returnUrl } = await request.json();

    // Create an account link specifically for collecting verification documents
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error creating Stripe verification link:', error);
    return NextResponse.json(
      { error: 'Failed to create verification link' },
      { status: 500 }
    );
  }
} 