import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

const supabase = createAdminClient();

// Prevent caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Security: Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Find all communities in pre_registration status with opening_date <= now
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('*')
      .eq('status', 'pre_registration')
      .lte('opening_date', now);

    if (communitiesError) {
      console.error('Error fetching communities:', communitiesError);
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
    }

    if (!communities || communities.length === 0) {
      return NextResponse.json({
        message: 'No communities ready to open',
        processed: 0
      });
    }

    const results = [];

    for (const community of communities) {
      try {
        // Get all pre-registered members for this community
        const { data: members, error: membersError } = await supabase
          .from('community_members')
          .select('*')
          .eq('community_id', community.id)
          .eq('status', 'pre_registered');

        if (membersError) {
          console.error(`Error fetching members for community ${community.id}:`, membersError);
          results.push({
            communityId: community.id,
            communityName: community.name,
            success: false,
            error: 'Failed to fetch members'
          });
          continue;
        }

        let successCount = 0;
        let failCount = 0;
        const memberResults = [];

        // Process each pre-registered member
        for (const member of members || []) {
          try {
            // The invoice should auto-finalize and charge, but we check its status
            if (member.stripe_invoice_id) {
              const invoice = await stripe.invoices.retrieve(
                member.stripe_invoice_id,
                {
                  stripeAccount: community.stripe_account_id,
                }
              );

              // If invoice is still draft, finalize it manually
              if (invoice.status === 'draft') {
                await stripe.invoices.finalizeInvoice(
                  member.stripe_invoice_id,
                  {
                    stripeAccount: community.stripe_account_id,
                  }
                );
              }

              // Invoice will be charged automatically by Stripe
              // We'll update member status via webhook when payment_intent.succeeded fires

              memberResults.push({
                userId: member.user_id,
                success: true,
                message: 'Invoice processed'
              });
              successCount++;
            } else {
              // No invoice found - this shouldn't happen
              console.error(`No invoice found for member ${member.user_id}`);

              // Update member to inactive
              await supabase
                .from('community_members')
                .update({ status: 'inactive' })
                .eq('id', member.id);

              memberResults.push({
                userId: member.user_id,
                success: false,
                error: 'No invoice found'
              });
              failCount++;
            }
          } catch (memberError) {
            console.error(`Error processing member ${member.user_id}:`, memberError);
            memberResults.push({
              userId: member.user_id,
              success: false,
              error: memberError instanceof Error ? memberError.message : 'Unknown error'
            });
            failCount++;
          }
        }

        // Update community status to active
        const { error: updateError } = await supabase
          .from('communities')
          .update({ status: 'active' })
          .eq('id', community.id);

        if (updateError) {
          console.error(`Error updating community ${community.id} status:`, updateError);
        }

        results.push({
          communityId: community.id,
          communityName: community.name,
          success: true,
          membersProcessed: members?.length || 0,
          successCount,
          failCount,
          memberResults
        });

      } catch (communityError) {
        console.error(`Error processing community ${community.id}:`, communityError);
        results.push({
          communityId: community.id,
          communityName: community.name,
          success: false,
          error: communityError instanceof Error ? communityError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Community openings processed',
      processed: communities.length,
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
