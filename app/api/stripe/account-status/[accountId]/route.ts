import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(
  request: Request,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const account = await stripe.accounts.retrieve(accountId);

    // Map requirements to more user-friendly messages
    const requirementMessages = {
      'individual.verification.document': 'Identity document required',
      'individual.verification.additional_document': 'Additional identity document required',
      'company.verification.document': 'Business verification document required',
      'company.license': 'Business license required',
      'company.tax_id': 'Business tax ID required',
      'company.address': 'Business address required',
      'individual.address': 'Personal address required',
      'individual.dob': 'Date of birth required',
      'individual.email': 'Email verification required',
      'individual.first_name': 'First name required',
      'individual.last_name': 'Last name required',
      'individual.phone': 'Phone number required',
      'individual.ssn_last_4': 'Last 4 digits of SSN required',
      'company.name': 'Company name required',
      'company.phone': 'Company phone required',
      'company.directors_provided': 'Company directors information required',
      'company.executives_provided': 'Company executives information required',
      'company.owners_provided': 'Company owners information required',
    };

    // Get detailed requirements information
    const requirements = {
      currentlyDue: account.requirements?.currently_due?.map(req => ({
        code: req,
        message: requirementMessages[req as keyof typeof requirementMessages] || req
      })) || [],
      pastDue: account.requirements?.past_due?.map(req => ({
        code: req,
        message: requirementMessages[req as keyof typeof requirementMessages] || req
      })) || [],
      eventuallyDue: account.requirements?.eventually_due?.map(req => ({
        code: req,
        message: requirementMessages[req as keyof typeof requirementMessages] || req
      })) || [],
      currentDeadline: account.requirements?.current_deadline,
      disabledReason: account.requirements?.disabled_reason,
    };

    return NextResponse.json({
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements,
      businessType: account.business_type,
      capabilities: account.capabilities,
      payoutSchedule: account.settings?.payouts?.schedule,
      defaultCurrency: account.default_currency,
      email: account.email,
    });
  } catch (error) {
    console.error('Error fetching Stripe account status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe account status' },
      { status: 500 }
    );
  }
} 