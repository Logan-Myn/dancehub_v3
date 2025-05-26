import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

const supabase = createAdminClient();

// This endpoint should be called by a cron job daily to update expired promotional members
export async function POST(request: Request) {
  try {
    // Optional: Add basic authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Find all members whose promotional period has ended
    const { data: expiredPromotionalMembers, error: fetchError } = await supabase
      .from("community_members")
      .select(`
        id,
        community_id,
        stripe_subscription_id,
        communities!inner(
          stripe_account_id,
          active_member_count
        )
      `)
      .eq("is_promotional_member", true)
      .lt("promotional_period_end", new Date().toISOString())
      .eq("status", "active");

    if (fetchError) {
      console.error("Error fetching expired promotional members:", fetchError);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    if (!expiredPromotionalMembers || expiredPromotionalMembers.length === 0) {
      return NextResponse.json({ message: "No expired promotional members found" });
    }

    const updatePromises = expiredPromotionalMembers.map(async (member: any) => {
      try {
        // Calculate new platform fee based on community size
        const { data: newFeePercentage } = await supabase
          .rpc('calculate_platform_fee_percentage', {
            member_count: member.communities.active_member_count
          });

        // Update the subscription in Stripe to include platform fees
        await stripe.subscriptions.update(
          member.stripe_subscription_id,
          {
            application_fee_percent: newFeePercentage,
            metadata: {
              promotional_period_ended: new Date().toISOString(),
              new_platform_fee_percentage: newFeePercentage.toString()
            }
          },
          {
            stripeAccount: member.communities.stripe_account_id,
          }
        );

        // Update the member record in the database
        const { error: updateError } = await supabase
          .from("community_members")
          .update({
            is_promotional_member: false,
            platform_fee_percentage: newFeePercentage,
            promotional_period_end: null
          })
          .eq("id", member.id);

        if (updateError) {
          console.error(`Error updating member ${member.id}:`, updateError);
          return { success: false, memberId: member.id, error: updateError };
        }

        return { success: true, memberId: member.id, newFeePercentage };
      } catch (error) {
        console.error(`Error processing member ${member.id}:`, error);
        return { success: false, memberId: member.id, error };
      }
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return NextResponse.json({
      message: "Promotional period updates completed",
      processed: expiredPromotionalMembers.length,
      successful: successful.length,
      failed: failed.length,
      failedMembers: failed.map(f => f.memberId)
    });

  } catch (error) {
    console.error("Error in promotional period update:", error);
    return NextResponse.json(
      { error: "Failed to update promotional periods" },
      { status: 500 }
    );
  }
}
