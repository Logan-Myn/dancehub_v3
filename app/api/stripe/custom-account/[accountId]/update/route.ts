import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

interface BusinessInfo {
  type: 'individual' | 'company';
  name?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  phone?: string;
  website?: string;
  mcc?: string;
}

interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dob?: {
    day: number;
    month: number;
    year: number;
  };
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  ssn_last_4?: string;
}

interface BankAccountInfo {
  account_number?: string;
  routing_number?: string;
  account_holder_name?: string;
  account_holder_type?: 'individual' | 'company';
  country?: string;
  currency?: string;
}

export async function PUT(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  const supabase = createAdminClient();
  
  try {
    const { accountId } = params;
    const { 
      step, 
      businessInfo, 
      personalInfo, 
      bankAccount,
      currentStep 
    } = await request.json();

    // Verify the account exists and belongs to a community
    const account = await stripe.accounts.retrieve(accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: 'Stripe account not found' },
        { status: 404 }
      );
    }

    const communityId = account.metadata?.community_id;
    if (!communityId) {
      return NextResponse.json(
        { error: 'Account not linked to community' },
        { status: 400 }
      );
    }

    let updateParams: any = {};

    // Handle different steps of the onboarding process
    switch (step) {
      case 'business_info':
        if (businessInfo) {
          updateParams = {
            business_type: businessInfo.type,
            ...(businessInfo.type === 'company' && businessInfo.name && {
              company: {
                name: businessInfo.name,
                ...(businessInfo.address && { address: businessInfo.address }),
                ...(businessInfo.phone && { phone: businessInfo.phone }),
              }
            }),
            ...(businessInfo.address && {
              business_profile: {
                name: businessInfo.name,
                url: businessInfo.website,
                mcc: businessInfo.mcc || '8299', // Educational services
              }
            })
          };
        }
        break;

      case 'personal_info':
        if (personalInfo) {
          updateParams = {
            individual: {
              ...(personalInfo.first_name && { first_name: personalInfo.first_name }),
              ...(personalInfo.last_name && { last_name: personalInfo.last_name }),
              ...(personalInfo.email && { email: personalInfo.email }),
              ...(personalInfo.phone && { phone: personalInfo.phone }),
              ...(personalInfo.dob && { dob: personalInfo.dob }),
              ...(personalInfo.address && { address: personalInfo.address }),
              ...(personalInfo.ssn_last_4 && { ssn_last_4: personalInfo.ssn_last_4 }),
            }
          };
        }
        break;

      case 'bank_account':
        if (bankAccount && bankAccount.account_number && bankAccount.routing_number) {
          // Create external account (bank account) for payouts
          try {
            await stripe.accounts.createExternalAccount(accountId, {
              external_account: {
                object: 'bank_account',
                account_number: bankAccount.account_number,
                routing_number: bankAccount.routing_number,
                account_holder_name: bankAccount.account_holder_name,
                account_holder_type: bankAccount.account_holder_type || 'individual',
                country: bankAccount.country || 'US',
                currency: bankAccount.currency || 'usd',
              }
            });
          } catch (bankError: any) {
            console.error('Error adding bank account:', bankError);
            return NextResponse.json(
              { error: 'Failed to add bank account: ' + bankError.message },
              { status: 400 }
            );
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid step provided' },
          { status: 400 }
        );
    }

    // Update the Stripe account if we have update parameters
    if (Object.keys(updateParams).length > 0) {
      try {
        await stripe.accounts.update(accountId, updateParams);
      } catch (stripeError: any) {
        console.error('Error updating Stripe account:', stripeError);
        return NextResponse.json(
          { error: 'Failed to update account: ' + stripeError.message },
          { status: 400 }
        );
      }
    }

    // Update onboarding progress in database
    const completedSteps = [];
    if (step === 'business_info') completedSteps.push(1);
    if (step === 'personal_info') completedSteps.push(2);
    if (step === 'bank_account') completedSteps.push(3);

    const updateData: any = {
      updated_at: new Date().toISOString(),
      ...(currentStep && { current_step: currentStep }),
    };

    if (businessInfo) updateData.business_info = businessInfo;
    if (personalInfo) updateData.personal_info = personalInfo;
    if (bankAccount) updateData.bank_account = bankAccount;

    // Update progress tracking
    const { error: progressError } = await supabase
      .from('stripe_onboarding_progress')
      .update(updateData)
      .eq('stripe_account_id', accountId);

    if (progressError) {
      console.warn('Failed to update onboarding progress:', progressError);
    }

    // Get updated account status
    const updatedAccount = await stripe.accounts.retrieve(accountId);
    
    return NextResponse.json({
      success: true,
      accountId: accountId,
      step: step,
      requirements: {
        currentlyDue: updatedAccount.requirements?.currently_due || [],
        pastDue: updatedAccount.requirements?.past_due || [],
        eventuallyDue: updatedAccount.requirements?.eventually_due || [],
      },
      charges_enabled: updatedAccount.charges_enabled,
      payouts_enabled: updatedAccount.payouts_enabled,
      details_submitted: updatedAccount.details_submitted,
      message: `${step} updated successfully`
    });

  } catch (error: any) {
    console.error('Error updating custom Stripe account:', error);
    
    if (error.type === 'StripeError') {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update account information' },
      { status: 500 }
    );
  }
} 