import { NextRequest, NextResponse } from 'next/server';
import { query, sql } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

interface Community {
  id: string;
  name: string;
  stripe_account_id: string | null;
  [key: string]: unknown;
}

interface Member {
  id: string;
  user_id: string;
  stripe_invoice_id: string | null;
}

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
    const communities = await query<Community>`
      SELECT *
      FROM communities
      WHERE status = 'pre_registration'
        AND opening_date <= ${now}
    `;

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
        const members = await query<Member>`
          SELECT *
          FROM community_members
          WHERE community_id = ${community.id}
            AND status = 'pre_registered'
        `;

        let successCount = 0;
        let failCount = 0;
        const memberResults = [];

        // Process each pre-registered member
        for (const member of members || []) {
          try {
            // The invoice should auto-finalize and charge, but we check its status
            if (member.stripe_invoice_id && community.stripe_account_id) {
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
              await sql`
                UPDATE community_members
                SET status = 'inactive'
                WHERE id = ${member.id}
              `;

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
        await sql`
          UPDATE communities
          SET status = 'active'
          WHERE id = ${community.id}
        `;

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
