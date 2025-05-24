import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, country = 'US', businessType = 'individual' } = await request.json();

    if (!communityId) {
      return NextResponse.json(
        { error: 'Community ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns this community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id, created_by, stripe_account_id')
      .eq('id', communityId)
      .eq('created_by', user.id)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: 'Community not found or unauthorized' },
        { status: 404 }
      );
    }

    // If community has a stripe_account_id, verify it's still valid
    if (community.stripe_account_id) {
      console.log('Checking if existing Stripe account is valid:', community.stripe_account_id);
      try {
        await stripe.accounts.retrieve(community.stripe_account_id);
        console.log('Existing Stripe account is valid');
        return NextResponse.json(
          { error: 'Community already has a Stripe account' },
          { status: 400 }
        );
      } catch (stripeError: any) {
        console.log('Existing Stripe account is invalid:', stripeError.message);
        // Account doesn't exist or is invalid, clear it from database and continue
        const { error: clearError } = await supabase
          .from('communities')
          .update({ stripe_account_id: null })
          .eq('id', communityId);
        
        if (clearError) {
          console.error('Failed to clear invalid stripe_account_id:', clearError);
        } else {
          console.log('Cleared invalid stripe_account_id from database');
        }
      }
    }

    // Create a Stripe Custom account for custom onboarding
    const account = await stripe.accounts.create({
      type: 'custom',
      country: country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: businessType,
      tos_acceptance: {
        service_agreement: 'full'
      },
      metadata: {
        community_id: communityId,
      },
    });

    // Update the community with the Stripe account ID
    const { error: updateError } = await supabase
      .from('communities')
      .update({ 
        stripe_account_id: account.id,
        stripe_onboarding_type: 'custom'
      })
      .eq('id', communityId);

    if (updateError) {
      // If database update fails, we should delete the Stripe account
      await stripe.accounts.del(account.id);
      throw updateError;
    }

    // Initialize onboarding progress tracking
    const { error: progressError } = await supabase
      .from('stripe_onboarding_progress')
      .insert({
        community_id: communityId,
        stripe_account_id: account.id,
        current_step: 1,
        completed_steps: [],
        business_info: {},
        personal_info: {},
        bank_account: {},
        documents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (progressError) {
      console.warn('Failed to create onboarding progress tracking:', progressError);
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({ 
      accountId: account.id,
      country: account.country,
      businessType: account.business_type,
      currentStep: 1,
      message: 'Stripe account created successfully. Ready for custom onboarding.'
    });

  } catch (error: any) {
    console.error('Error creating custom Stripe account:', error);
    
    if (error.type === 'StripeError') {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create Stripe account' },
      { status: 500 }
    );
  }
} 