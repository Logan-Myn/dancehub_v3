import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// GET endpoint to fetch bank account details
export async function GET(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    
    // Retrieve the external account (bank account) information
    const account = await stripe.accounts.retrieve(accountId);
    const bankAccounts = await stripe.accounts.listExternalAccounts(
      accountId,
      { object: 'bank_account', limit: 1 }
    );

    const bankAccount = bankAccounts.data[0] as Stripe.BankAccount;

    if (!bankAccount) {
      return NextResponse.json({ error: 'No bank account found' }, { status: 404 });
    }

    return NextResponse.json({
      last4: bankAccount.last4,
      country: bankAccount.country,
      currency: bankAccount.currency,
      account_holder_name: bankAccount.account_holder_name,
    });
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank account details' },
      { status: 500 }
    );
  }
}

// PUT endpoint to create a login link for bank account management
export async function PUT(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;

    // Create a login link to the Stripe Express dashboard where they can manage their bank account
    const loginLink = await stripe.accounts.createLoginLink(accountId);

    return NextResponse.json({
      success: true,
      url: loginLink.url
    });
  } catch (error: any) {
    console.error('Error creating login link:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create login link',
        code: error.code
      },
      { status: error.statusCode || 500 }
    );
  }
} 