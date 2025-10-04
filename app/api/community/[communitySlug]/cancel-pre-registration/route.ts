import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

const supabase = createAdminClient();

export async function POST(
  request: Request,
  { params }: { params: { communitySlug: string } }
) {
  try {
    const { userId } = await request.json();

    // Get community details
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("id, stripe_account_id")
      .eq("slug", params.communitySlug)
      .single();

    if (communityError || !community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get member record
    const { data: member, error: memberError } = await supabase
      .from("community_members")
      .select()
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Pre-registration not found" },
        { status: 404 }
      );
    }

    // Verify member is in pre-registration status
    if (member.status !== 'pending_pre_registration' && member.status !== 'pre_registered') {
      return NextResponse.json(
        { error: "Member is not in pre-registration status" },
        { status: 400 }
      );
    }

    // Cancel the scheduled invoice if it exists
    if (member.stripe_invoice_id) {
      try {
        await stripe.invoices.voidInvoice(
          member.stripe_invoice_id,
          {
            stripeAccount: community.stripe_account_id,
          }
        );
      } catch (stripeError: any) {
        // If invoice is already voided or doesn't exist, that's fine
        if (stripeError.code !== 'invoice_not_found' && stripeError.code !== 'resource_already_exists') {
          console.error("Error voiding invoice:", stripeError);
        }
      }
    }

    // Delete the payment method from Stripe if it exists
    if (member.pre_registration_payment_method_id) {
      try {
        await stripe.paymentMethods.detach(
          member.pre_registration_payment_method_id,
          {
            stripeAccount: community.stripe_account_id,
          }
        );
      } catch (stripeError: any) {
        // If payment method doesn't exist or is already detached, that's fine
        console.error("Error detaching payment method:", stripeError);
      }
    }

    // Delete the customer from Stripe if it exists
    if (member.stripe_customer_id) {
      try {
        await stripe.customers.del(
          member.stripe_customer_id,
          {
            stripeAccount: community.stripe_account_id,
          }
        );
      } catch (stripeError: any) {
        // If customer doesn't exist, that's fine
        console.error("Error deleting customer:", stripeError);
      }
    }

    // Remove member record from database
    const { error: deleteError } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", community.id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting member:", deleteError);
      return NextResponse.json(
        { error: "Failed to cancel pre-registration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pre-registration cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling pre-registration:", error);
    return NextResponse.json(
      { error: "Failed to cancel pre-registration" },
      { status: 500 }
    );
  }
}
