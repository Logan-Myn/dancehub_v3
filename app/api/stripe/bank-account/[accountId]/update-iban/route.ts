import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const { iban, accountHolderName } = await request.json();

    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns a community with this Stripe account
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, created_by')
      .eq('stripe_account_id', accountId)
      .eq('created_by', user.id)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate input
    if (!iban || !accountHolderName) {
      return NextResponse.json(
        { error: 'IBAN and account holder name are required' },
        { status: 400 }
      );
    }

    // Get the connected account details
    const account = await stripe.accounts.retrieve(accountId);
    
    if (account.type !== 'custom') {
      return NextResponse.json(
        { error: 'Bank account updates are only supported for custom accounts' },
        { status: 400 }
      );
    }

    // Get current external accounts (bank accounts)
    const existingBankAccounts = await stripe.accounts.listExternalAccounts(
      accountId,
      { object: 'bank_account', limit: 10 }
    );

    const currentBankAccount = existingBankAccounts.data[0];
    const currency = currentBankAccount?.currency || account.default_currency || 'eur';
    const isCurrentlyDefault = currentBankAccount?.default_for_currency || false;

    // Create new bank account with updated IBAN
    const newBankAccount = await stripe.accounts.createExternalAccount(accountId, {
      external_account: {
        object: 'bank_account',
        country: account.country || 'FR', // Default to France for IBAN
        currency: currency,
        account_holder_name: accountHolderName,
        account_holder_type: 'individual',
        iban: iban,
      },
    });

    // If the old bank account was default, make the new one default
    if (isCurrentlyDefault && newBankAccount.id) {
      await stripe.accounts.updateExternalAccount(
        accountId,
        newBankAccount.id,
        { default_for_currency: true }
      );
    }

    // Delete the old bank account if it exists
    if (currentBankAccount?.id) {
      try {
        await stripe.accounts.deleteExternalAccount(accountId, currentBankAccount.id);
      } catch (deleteError: any) {
        console.warn('Could not delete old bank account:', deleteError.message);
        // Don't fail the request if we can't delete the old account
        // The new account has been created successfully
      }
    }

    return NextResponse.json({
      success: true,
      bankAccount: {
        id: newBankAccount.id,
        last4: newBankAccount.last4,
        country: newBankAccount.country,
        currency: newBankAccount.currency,
        account_holder_name: newBankAccount.account_holder_name,
        default_for_currency: newBankAccount.default_for_currency,
      },
      message: 'Bank account updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating bank account IBAN:', error);
    
    if (error.type === 'StripeError') {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update bank account' },
      { status: 500 }
    );
  }
}