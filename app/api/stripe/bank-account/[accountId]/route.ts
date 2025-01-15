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
      bank_name: bankAccount.bank_name,
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

// PUT endpoint to update bank account
export async function PUT(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const { iban } = await request.json();

    // Create a new external account
    const bankAccount = await stripe.accounts.createExternalAccount(
      accountId,
      {
        external_account: {
          object: 'bank_account',
          country: 'FR', // Hardcoded for France
          currency: 'eur',
          account_number: iban,
        },
      }
    ) as Stripe.BankAccount;

    return NextResponse.json({
      success: true,
      last4: bankAccount.last4,
      account_holder_name: bankAccount.account_holder_name,
    });
  } catch (error: any) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update bank account',
        code: error.code
      },
      { status: error.statusCode || 500 }
    );
  }
} 